py_script = `
import arbor
import plotly.express as px
import arbor_playground

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

fig = px.line(x=t, y=v)
fig_html = fig.to_html(
    include_plotlyjs=False,
    full_html=False,
    default_height='100%'
)

arbor_playground.render_html(fig_html)
`

async function main() {
    let py_src = document.getElementById('textarea-src')
    py_src.value = py_script.replace('\n', '\r\n')
    let console = document.getElementById('console')
    let run_btn = document.getElementById('run-btn')
    function message_ok(msg) {
        console.innerText += msg + '\n'
    }
    function message_err(msg) {
        message_ok(msg)
    }
    message_ok('Loading...')
    let pyodide = await loadPyodide({
        stdout: (msg) => {
            message_ok(msg)
        },
        stderr: (msg) => {
            message_err(msg)
        },
    })
    py = pyodide
    await pyodide.loadPackage('micropip')
    message_ok('Loaded micropip')
    await pyodide.loadPackage('numpy')
    message_ok('Loaded numpy')
    await pyodide.loadPackage('pandas')
    message_ok('Loaded pandas')
    await pyodide.loadPackage('arbor-0.7-py3-none-any.whl')
    message_ok('Loaded arbor')
    await pyodide.loadPackage('tenacity-8.1.0-py3-none-any.whl')
    message_ok('Loaded tenacity')
    await pyodide.loadPackage('plotly-5.0.0-py2.py3-none-any.whl')
    message_ok('Loaded plotly')
    function render_html_output(html) {
        var range = document.createRange();
        let container = document.getElementById('render-html-output')
        range.selectNode(container);
        var documentFragment = range.createContextualFragment(html);
        while (container.hasChildNodes()) {  
            container.removeChild(container.firstChild);
        }
        container.appendChild(documentFragment);
        container.className = "plotly";
    }
    let plot_module = {
        render_html(html) {
            render_html_output(html)
        }
    }
    pyodide.registerJsModule('arbor_playground', plot_module)
    message_ok('Registered html render module')

    async function run_code(code=null) {
        if (code == null) console.innerText = ''
        try {
            await pyodide.runPython(code == null ? py_src.value : code)
        } catch (error) {
            message_err(error)
        }
        console.scrollTop = console.scrollHeight;
    }

    run_code('import pandas, arbor, plotly, numpy')

    message_ok('Cached pandas, arbor, plotly')

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

    message_ok('Ready!')
    run_btn.classList.add("ready");

};
main();
