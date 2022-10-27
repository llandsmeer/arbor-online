const MODELS = [
    {
        title: 'Single cell model',
        url: 'models/single_cell_model.py',
        description: 'Single Hodgkin-Huxley cell',
        enabled: true
    },
    {
        title: 'Single cell recipe',
        url: 'models/single_cell_recipe.py',
        description: 'Single Hodgkin-Huxley cell (via recipe)',
        enabled: true
    },
    {
        title: 'Diffusion',
        url: 'models/diffusion.py',
        description: 'Minimal example showcasing sodium diffusion through cell compartments.',
        enabled: true
    },
    {
        title: 'Gap junctions',
        url: 'models/gap_junctions.py',
        description: 'Minimal example of multicompartmental cells connected via gap junctions and synapses.',
        enabled: true
    },
    {
        title: 'Network ring',
        url: 'models/network_ring.py',
        description: 'Minimal example of a network in Arbor. Four cells connected with delayed synapses leads to a persistent traveling wave in the network.',
        enabled: true
    },
    {
        title: 'Brunel',
        url: 'models/brunel.py',
        description: 'Advanced network example. Sparsely connected excitatory and inhibitory LIF cells exhibit different synchronization states. Brunel, N. (2000). Dynamics of sparsely connected networks of excitatory and inhibitory spiking neurons. Journal of computational neuroscience, 8(3), 183-208.',
        enabled: true
    },
    {
        title: 'Plasticity',
        url: 'models/plasticity.py',
        description: 'Example of modifying synaptic connections in a running simulation. Thihs is done via the simulation.update_connections(recipe) function, which re-reads the recipe\'s connections_on().',
        enabled: true
    },
    {
        title: 'Spike-timing-dependent plasticity',
        url: 'models/single_cell_stdp.py',
        description: 'STDP example using a single cell and explicit spike generators',
        enabled: true
    },
    {
        title: 'single_cell_detailed_recipe.py',
        url: 'models/single_cell_detailed_recipe.py',
        description: 'SWC loading',
        filesystem: [
            {
                path: 'single_cell_detailed_recipe.swc',
                url: 'models/single_cell_detailed_recipe.swc'
            }
        ],
        enabled: false
    },
]

function quote(text) {
    return (''+text).replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function add_resize_handler() {
    const grid_parent = document.getElementsByClassName('parent')[0]
    const hresize = document.getElementsByClassName('hresize')[0]
    let is_dragging = false
    let on_start = (e) => {
        if (e.target === hresize) {
            is_dragging = true
            e.preventDefault()
        }
    }
    let on_move = (e) => {
        if (!is_dragging) return;
        let x = e.clientX
        let rect = grid_parent.getBoundingClientRect()
        let fraction = (x - rect.left) / (rect.width - 10);
        fraction = Math.min(Math.max(.05, fraction), .95)
        const total = 1000
        fraction = Math.round(fraction * total)
        grid_parent.style.gridTemplateColumns = `${fraction}fr 10px ${total - fraction}fr`
        e.preventDefault()
    }
    let on_end = (e) => {
        is_dragging = false
    }
    document.addEventListener('mousedown', on_start);
    document.addEventListener('mousemove', on_move);
    document.addEventListener('mouseup', on_end)
    document.addEventListener('touchstart', on_start);
    document.addEventListener('touchmove', on_move);
    document.addEventListener('touchend', on_end)
}

async function main() {
    add_resize_handler();
    let editor = null
    let console_output = document.getElementById('console')
    let run_btn = document.getElementById('run-btn')
    let welcome_btn = document.getElementById('welcome-btn')
    let current_modal = null
    function message_ok(msg) {
        console_output.innerHTML += quote(msg) + '\n'
    }
    function message_err(msg) {
        console_output.innerHTML += '<span class="error">' + quote(msg) + '</span>\n'
    }
    /* START MODAL CODE */
    document.querySelectorAll('.modal-close').forEach(e => {
        e.onclick = function() {
            if (current_modal != null) {
                current_modal.style.display = 'none';
                current_modal = null
            }
        }
    })
    function show_modal(id) {
        let m = document.getElementById(id)
        current_modal = m
        m.style.display = 'block'
    }
    window.onclick = function(event) {
        if (event.target == current_modal) {
            current_modal.style.display = 'none';
        }
    }
    show_modal('welcome-modal')
    welcome_btn.onclick = () => {
        show_modal('welcome-modal')
    }
    let container = document.getElementById('available-models')
    MODELS.forEach((model, i) => {
        const is_localhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        if (!is_localhost && !model.enabled) { return }
        container.innerHTML += `
            <div class="loadable-model" data-model-idx="${i}">
                <h3>${quote(model.title)}</h3>
                <p>${quote(model.description)}</p>
            </div>
        `
    })
    async function load_model(model) {
        if (editor == null) return
        let res = await fetch(model.url)
        editor.session.setValue(await res.text())
        if (model.filesystem) {
            pyodide.FS.chdir('/home/pyodide')
            for (const {path, url} of model.filesystem) {
                message_ok('loading ' + path)
                let r = await fetch(url)
                let data = await r.text()
                pyodide.FS.writeFile(path, data, { encoding: "utf8" });
            }
        }

        await run_code()
    }
    document.querySelectorAll('.loadable-model').forEach(target => {
        target.onclick = async () => {
            if (editor == null) return
            let idx = target.getAttribute('data-model-idx')
            let model = MODELS[idx]
            await load_model(model)
            current_modal.style.display = 'none';
        }
    })

    /* END MODAL CODE */
    message_ok('Loading...')
    let pyodide = await loadPyodide({
        stdout: (msg) => {
            message_ok(msg)
        },
        stderr: (msg) => {
            message_err(msg)
        },
    })
    py = pyodide // global export for debugging
    await Promise.all([
        (async () => {
            await pyodide.loadPackage('micropip')
            message_ok('Loaded micropip')
        })(),
        (async () => {
            await pyodide.loadPackage('numpy')
            message_ok('Loaded numpy')
        })(),
        (async () => {
            await pyodide.loadPackage('pandas')
            message_ok('Loaded pandas')
        })(),
        (async () => {
            await pyodide.loadPackage('arbor-0.7-py3-none-any.whl')
            message_ok('Loaded arbor')
        })(),
        (async () => {
            await pyodide.loadPackage('tenacity-8.1.0-py3-none-any.whl')
            message_ok('Loaded tenacity')
        })(),
        (async () => {
            await pyodide.loadPackage('plotly-5.0.0-py2.py3-none-any.whl')
            message_ok('Loaded plotly')
        })(),
    ])

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
        if (code == null) {
            console_output.innerText = ''
            render_html_output('')
            run_btn.classList.remove("ready");
            message_ok('Console output [' + (new Date()).toISOString() + ']')
        }
        try {
            await pyodide.runPython(code == null ? editor.getValue() : code)
        } catch (error) {
            message_err(error)
        }
        console_output.scrollTop = console_output.scrollHeight;
        if (code == null) {
            run_btn.classList.add("ready");
        }
    }

    await run_code('import pandas, arbor, plotly, numpy')

    message_ok('Cached pandas, arbor, plotly')

    editor = ace.edit('editor')
    editor.setTheme('ace/theme/monokai')
    editor.session.setMode('ace/mode/python')
    message_ok('Set up editor')

    message_ok('Ready!')

    run_btn.onclick = async () => {
        await run_code();
    }

    await load_model(MODELS[0])

    run_btn.classList.add("ready");


};

main();
