/* ===== DATOS Y ESTADOS GLOBALES ===== */
let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
let contadorId = tickets.length > 0 ? Math.max(...tickets.map(t => parseInt(t.id.split('-')[1]))) + 1 : 1000;
let idTicketEnEdicion = null;
let columnaActual = null;
let ordenAscendente = true;

const matrizAsignacion = {
    'hardware': 'Téc. Nivel 1 - Soporte Físico',
    'software': 'Téc. Nivel 2 - Sistemas e Infraestructura',
    'redes': 'Ing. Telecomunicaciones y Conectividad',
    'documental': 'Soporte Especializado - Gestión Documental'
};

/* ===== LOGIN & GESTIÓN DE ROLES ===== */
function login() {
    let user = document.getElementById("user").value;
    let pass = document.getElementById("pass").value;
    let error = document.getElementById("errorMsg");

    if (!user || !pass) {
        error.style.display = "block"; error.innerText = "Complete los campos"; return;
    }

    let rolAsignado = "Técnico"; // Por defecto
    if(user === "admin" && pass === "admin") rolAsignado = "Administrador";
    else if(user !== "tecnico" || pass !== "tecnico") {
        error.style.display = "block"; error.innerText = "Credenciales incorrectas"; return;
    }

    localStorage.setItem("usuarioActivo", user);
    localStorage.setItem("rolActivo", rolAsignado);
    iniciarApp();
}

function cerrarSesion() {
    localStorage.removeItem("usuarioActivo");
    localStorage.removeItem("rolActivo");
    location.reload();
}

function iniciarApp() {
    let user = localStorage.getItem("usuarioActivo");
    let rol = localStorage.getItem("rolActivo");

    if (user) {
        document.getElementById("usuarioActivo").innerText = user;
        document.getElementById("rolActivoDisplay").innerText = rol;
        document.getElementById("login").style.display = "none";
        document.getElementById("app").style.display = "block";
        
        // RBAC: Mostrar u ocultar funcionalidad según rol
        if(rol === "Administrador") {
            document.getElementById("btnNavAnalitica").style.display = "block";
        }

        mostrar('dashboard');
    }
}

/* ===== NAVEGACIÓN ===== */
function mostrar(sec) {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("crear").style.display = "none";
    document.getElementById("analitica").style.display = "none";
    document.getElementById(sec).style.display = "block";
    
    if(sec === 'dashboard') cargarTablaPrincipal();
    if(sec === 'analitica') calcularKPIs();
}

/* ===== CREAR / ACTUALIZAR TICKET (+ TIMESTAMPS) ===== */
function guardarTicket() {
    let asunto = document.getElementById("asunto").value;
    let categoria = document.getElementById("categoria").value;
    let prioridad = document.getElementById("prioridad").value;
    let descripcion = document.getElementById("descripcion").value;

    if (!asunto || !categoria || !descripcion) { alert("Campos obligatorios"); return; }

    let tecnicoAsignado = matrizAsignacion[categoria] || 'Escalado a Coordinación';

    if (idTicketEnEdicion !== null) {
        const index = tickets.findIndex(t => t.id === idTicketEnEdicion);
        if (index !== -1) {
            tickets[index].asunto = asunto;
            tickets[index].categoriaRaw = categoria;
            tickets[index].categoria = formatearTexto(categoria);
            tickets[index].prioridad = prioridad;
            tickets[index].descripcion = descripcion;
            tickets[index].tecnico = tecnicoAsignado; 
        }
        mostrarMensaje("Ticket actualizado");
    } else {
        let ticket = {
            id: `TKT-${contadorId++}`,
            asunto: asunto,
            categoriaRaw: categoria,
            categoria: formatearTexto(categoria),
            prioridad: prioridad,
            descripcion: descripcion,
            tecnico: tecnicoAsignado, 
            estado: "Abierto",
            // MARCAS DE TIEMPO
            tsCreacion: Date.now(),
            tsAtencion: null,
            tsResolucion: null
        };
        tickets.push(ticket);
        mostrarMensaje("Ticket creado");
    }

    guardarData();
    limpiarFormulario();
    mostrar('dashboard');
}

/* ===== MANEJO DE ESTADOS (CAPTURA DE TIEMPOS) ===== */
function cambiarEstado(id, estado) {
    let ticket = tickets.find(t => t.id === id);
    if (ticket) {
        ticket.estado = estado;
        
        // Registrar tiempo de primera atención
        if(estado === "En proceso" && !ticket.tsAtencion) {
            ticket.tsAtencion = Date.now();
        }
        // Registrar tiempo de resolución
        if(estado === "Resuelto" && !ticket.tsResolucion) {
            ticket.tsResolucion = Date.now();
            if(!ticket.tsAtencion) ticket.tsAtencion = Date.now(); // Por si pasan directo a resuelto
        }
    }
    guardarData();
    cargarTablaPrincipal(false);
}

/* ===== ANALÍTICA Y KPIs ===== */
function calcularKPIs() {
    let totalTMA = 0, conteoTMA = 0;
    let totalTMR = 0, conteoTMR = 0;
    let tbodyTiempos = document.getElementById("tiemposBody");
    tbodyTiempos.innerHTML = "";

    tickets.forEach(t => {
        // Cálculo TMA
        if (t.tsAtencion) {
            totalTMA += (t.tsAtencion - t.tsCreacion);
            conteoTMA++;
        }
        // Cálculo TMR
        if (t.tsResolucion) {
            let tiempoResolucion = t.tsResolucion - t.tsCreacion;
            totalTMR += tiempoResolucion;
            conteoTMR++;

            // Llenar tabla de tiempos
            let tr = document.createElement("tr");
            tr.innerHTML = `<td>${t.id}</td><td>${t.categoria}</td><td>${formatearMilisegundos(tiempoResolucion)}</td>`;
            tbodyTiempos.appendChild(tr);
        }
    });

    let promedioTMA = conteoTMA > 0 ? (totalTMA / conteoTMA) : 0;
    let promedioTMR = conteoTMR > 0 ? (totalTMR / conteoTMR) : 0;

    document.getElementById("kpiTma").innerText = formatearMilisegundos(promedioTMA);
    document.getElementById("kpiTmr").innerText = formatearMilisegundos(promedioTMR);

    // LÓGICA DE REDUCCIÓN (Línea base simulada: 48 horas = 172,800,000 ms)
    const lineaBaseMs = 172800000; 
    if(conteoTMR > 0) {
        let reduccion = ((lineaBaseMs - promedioTMR) / lineaBaseMs) * 100;
        let porcentajeFormat = reduccion.toFixed(1) + "%";
        let elmReduccion = document.getElementById("kpiReduccion");
        
        elmReduccion.innerText = porcentajeFormat;
        if(reduccion >= 40) elmReduccion.classList.add("mejorado");
        else elmReduccion.classList.remove("mejorado");
    } else {
        document.getElementById("kpiReduccion").innerText = "S/D";
    }
}

function formatearMilisegundos(ms) {
    if (ms === 0) return "0s";
    let segundos = Math.floor(ms / 1000);
    let minutos = Math.floor(segundos / 60);
    let horas = Math.floor(minutos / 60);
    
    segundos = segundos % 60;
    minutos = minutos % 60;

    if (horas > 0) return `${horas}h ${minutos}m`;
    if (minutos > 0) return `${minutos}m ${segundos}s`;
    return `${segundos}s`;
}

/* ===== TABLA PRINCIPAL Y RENDERIZADO ===== */
function cargarTablaPrincipal(resetSort = true) {
    let tbody = document.getElementById("ticketsBody");
    tbody.innerHTML = "";
    let abiertos = 0, proceso = 0, resueltos = 0;

    tickets.forEach(t => {
        let tr = document.createElement("tr");
        tr.innerHTML = `
        <td><strong>${t.id}</strong></td>
        <td>${t.asunto}</td>
        <td>${t.categoria}</td>
        <td><span class="badge badge-${t.prioridad}">${formatearTexto(t.prioridad)}</span></td>
        <td>${t.tecnico}</td>
        <td>
            <select class="select-estado" onchange="cambiarEstado('${t.id}', this.value)">
                <option ${t.estado=="Abierto"?"selected":""}>Abierto</option>
                <option ${t.estado=="En proceso"?"selected":""}>En proceso</option>
                <option ${t.estado=="Resuelto"?"selected":""}>Resuelto</option>
            </select>
        </td>
        <td>
            <button class="btn-editar" onclick="cargarDatosEdicion('${t.id}')">Editar</button>
            <button class="btn-delete" onclick="eliminar('${t.id}')">X</button>
        </td>`;
        tbody.appendChild(tr);

        if (t.estado == "Abierto") abiertos++;
        else if (t.estado == "En proceso") proceso++;
        else resueltos++;
    });

    document.getElementById("abiertos").innerText = abiertos;
    document.getElementById("proceso").innerText = proceso;
    document.getElementById("resueltos").innerText = resueltos;
}

// RESTO DE FUNCIONES (Iguales)
window.cargarDatosEdicion = function(id) {
    const t = tickets.find(t => t.id === id);
    if (!t) return;
    document.getElementById('asunto').value = t.asunto;
    document.getElementById('categoria').value = t.categoriaRaw; 
    document.getElementById('prioridad').value = t.prioridad;
    document.getElementById('descripcion').value = t.descripcion;

    idTicketEnEdicion = id;
    document.getElementById('formTitulo').textContent = `Editando Ticket: ${id}`;
    document.getElementById('btnSubmit').textContent = 'Actualizar Ticket';
    document.getElementById('btnCancelar').style.display = 'block';
    mostrar('crear');
};

function limpiarFormulario() {
    document.getElementById("asunto").value = "";
    document.getElementById("categoria").selectedIndex = 0;
    document.getElementById("prioridad").value = "media";
    document.getElementById("descripcion").value = "";
    idTicketEnEdicion = null;
    document.getElementById('formTitulo').textContent = 'Nuevo Ticket';
    document.getElementById('btnSubmit').textContent = 'Crear y Asignar';
    document.getElementById('btnCancelar').style.display = 'none';
}

function eliminar(id) {
    if(confirm("¿Eliminar este ticket?")) {
        tickets = tickets.filter(t => t.id !== id);
        guardarData();
        cargarTablaPrincipal();
    }
}

document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const col = th.getAttribute('data-column');
        if (columnaActual === col) ordenAscendente = !ordenAscendente;
        else { columnaActual = col; ordenAscendente = true; }

        const pPrioridad = { 'critica': 4, 'alta': 3, 'media': 2, 'baja': 1 };
        const pEstado = { 'Resuelto': 3, 'En proceso': 2, 'Abierto': 1 };

        tickets.sort((a, b) => {
            let vA = a[col]; let vB = b[col];
            if (col === 'prioridad') { vA = pPrioridad[vA]; vB = pPrioridad[vB]; }
            else if (col === 'estado') { vA = pEstado[vA]; vB = pEstado[vB]; }
            else if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = vB.toLowerCase(); }

            if (vA < vB) return ordenAscendente ? -1 : 1;
            if (vA > vB) return ordenAscendente ? 1 : -1;
            return 0;
        });
        cargarTablaPrincipal(false);
    });
});

function guardarData() { localStorage.setItem("tickets", JSON.stringify(tickets)); }
function formatearTexto(txt) { return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : ''; }
function mostrarMensaje(txt) {
    let msg = document.createElement("div"); msg.innerText = txt;
    msg.style.cssText = "position:fixed; bottom:20px; right:20px; background:#27ae60; color:white; padding:10px 20px; border-radius:5px; z-index:1000;";
    document.body.appendChild(msg); setTimeout(() => msg.remove(), 3000);
}

iniciarApp();
