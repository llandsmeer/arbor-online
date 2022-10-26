py_script = `
import arbor
import plotting

tree = arbor.segment_tree()
tree.append(arbor.mnpos, arbor.mpoint(-3, 0, 0, 3), arbor.mpoint(3, 0, 0, 3), tag=1)

labels = arbor.label_dict({"soma": "(tag 1)", "midpoint": "(location 0 0.5)"})

decor = (
    arbor.decor()
    .set_property(Vm=-40)
    .paint('"soma"', arbor.density("hh"))
    .place('"midpoint"', arbor.iclamp(10, 2, 0.8), "iclamp")
    .place('"midpoint"', arbor.threshold_detector(-10), "detector")
)

cell = arbor.cable_cell(tree, decor, labels)

class single_recipe(arbor.recipe):
    def __init__(self):
        arbor.recipe.__init__(self)
        self.the_props = arbor.neuron_cable_properties()

    def num_cells(self):
        return 1

    def cell_kind(self, gid):
        return arbor.cell_kind.cable

    def cell_description(self, gid):
        return cell

    def probes(self, gid):
        return [arbor.cable_probe_membrane_voltage('"midpoint"')]

    def global_properties(self, kind):
        return self.the_props


recipe = single_recipe()

sim = arbor.simulation(recipe)

sim.record(arbor.spike_recording.all)
handle = sim.sample((0, 0), arbor.regular_schedule(0.1))
sim.run(tfinal=30)

spikes = sim.spikes()
data, meta = sim.samples(handle)[0]

if len(spikes) > 0:
    print("{} spikes:".format(len(spikes)))
    for t in spikes["time"]:
        print("{:3.3f}".format(t))
else:
    print("no spikes")

t = data[:, 0]
v = data[:, 1]

plotting.plot(t, v)
`

async function main() {
    let py_src = document.getElementById('textarea-src')
    py_src.value = py_script.replace('\n', '\r\n')
    let console = document.getElementById('console')
    let run_btn = document.getElementById('run-btn')
    let plot_canvas = document.getElementById('plot-canvas')
    let ctx = plot_canvas.getContext('2d')
    console.innerText += 'Loading...\n'
    let pyodide = await loadPyodide({
        stdout: (msg) => {
            console.innerText += msg + '\n'
        },
        stderr: (msg) => {
            console.innerText += msg + '\n'
        },
    })
    function buffer_to_array(b, normalize=false) {
        let x = []
        for (let i = 0; i < b.shape[0]; i++) {
            x.push(b.data[b.offset + i*b.strides[0]]);
        }
        if (normalize) {
            let xmin = +1e100
            let xmax = -1e100
            for (let i = 0; i < x.length; i++) {
                // avoid nan
                if (x[i] > xmax) xmax = x[i]
                if (x[i] < xmin) xmin = x[i]
            }
            for (let i = 0; i < x.length; i++) {
                if (x[i] == x[i]) {
                    x[i] = (x[i] - xmin) / (xmax - xmin)
                } else {
                    x[i] = (xmin + xmax) / 2
                }
            }
        }
        return x
    }
    function plot_norm(x, y) {
        plot_canvas.width = plot_canvas.clientWidth
        plot_canvas.height = plot_canvas.clientHeight
        ctx.clearRect(0, 0, plot_canvas.width, plot_canvas.height);
        ctx.beginPath();
        ctx.moveTo(x[0]*plot_canvas.width, y[0]*plot_canvas.height);
        for (let i = 1; i < x.length; i++) {
            ctx.lineTo(x[i]*plot_canvas.width, (1 - y[i])*plot_canvas.height);
        }
        ctx.stroke();
    }
    let plot_module = {
        plot: function (x, y) {
            let xx = buffer_to_array(x.getBuffer(), true)
            let yy = buffer_to_array(y.getBuffer(), true)
            plot_norm(xx, yy)
        }
    };
    pyodide.registerJsModule("plotting", plot_module);
    py = pyodide
    await pyodide.loadPackage('micropip')
    await pyodide.loadPackage('numpy')
    await pyodide.loadPackage('pandas')
    await pyodide.loadPackage('arbor-0.7-py3-none-any.whl')

    async function run_code() {
        console.innerText = ''
        try {
            await pyodide.runPython(py_src.value)
        } catch (error) {
            console.innerText += '\n' + error + '\n'
        }
        console.scrollTop = console.scrollHeight;
    }

    py_src.key_down = (e) => {
        if (e.keyCode == 13) {
            if (e.ctrlKey) {
                run_code()
                e.preventDefault()
                return true;
            }
        }
        return false
    }
    run_btn.onclick = async () => {
        await run_code();
    }

    console.innerText += 'Ready!\n'

};
main();
