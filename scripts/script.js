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

/* ===== LOGIN & SESIÓN ===== */
function login() {
    let user = document.getElementById("user").value;
    let pass = document.getElementById("pass").value;
    let error = document.getElementById("errorMsg");

    if (!user || !pass) {
        error.style.display = "block";
        error.innerText = "Complete los campos";
        return;
    }
    localStorage.setItem("usuarioActivo", user);
    iniciarApp();
}

function cerrarSesion() {
    localStorage.removeItem("usuarioActivo");
    location.reload();
}

function iniciarApp() {
    let user = localStorage.getItem("usuarioActivo");
    if (user) {
        document.getElementById("usuarioActivo").innerText = user;
        document.getElementById("login").style.display = "none";
        document.getElementById("app").style.display = "block";
        cargar();
    }
}

/* ===== NAVEGACIÓN ===== */
function mostrar(sec) {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("crear").style.display = "none";
    document.getElementById(sec).style.display = "block";
    if(sec === 'dashboard') cargar();
}

/* ===== CREAR / ACTUALIZAR TICKET ===== */
function guardarTicket() {
    let asunto = document.getElementById("asunto").value;
    let categoria = document.getElementById("categoria").value;
    let prioridad = document.getElementById("prioridad").value;
    let descripcion = document.getElementById("descripcion").value;

    if (!asunto || !categoria || !descripcion) {
        alert("Todos los campos son obligatorios");
        return;
    }

    let tecnicoAsignado = matrizAsignacion[categoria] || 'Escalado a Coordinación';

    if (idTicketEnEdicion !== null) {
        // Modo Edición
        const index = tickets.findIndex(t => t.id === idTicketEnEdicion);
        if (index !== -1) {
            tickets[index].asunto = asunto;
            tickets[index].categoriaRaw = categoria;
            tickets[index].categoria = formatearTexto(categoria);
            tickets[index].prioridad = prioridad;
            tickets[index].descripcion = descripcion;
            tickets[index].tecnico = tecnicoAsignado; // Reasignación automática
        }
        mostrarMensaje("✅ Ticket actualizado correctamente");
    } else {
        // Modo Creación
        let ticket = {
            id: `TKT-${contadorId++}`,
            asunto: asunto,
            categoriaRaw: categoria,
            categoria: formatearTexto(categoria),
            prioridad: prioridad,
            descripcion: descripcion,
            tecnico: tecnicoAsignado, // Asignación automática
            fecha: new Date().toLocaleDateString(),
            estado: "Abierto"
        };
        tickets.push(ticket);
        mostrarMensaje("✅ Ticket creado correctamente");
    }

    guardarData();
    limpiarFormulario();
    mostrar('dashboard');
}

/* ===== EDITAR Y LIMPIAR ===== */
window.cargarDatosEdicion = function(id) {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    document.getElementById('asunto').value = ticket.asunto;
    document.getElementById('categoria').value = ticket.categoriaRaw; 
    document.getElementById('prioridad').value = ticket.prioridad;
    document.getElementById('descripcion').value = ticket.descripcion;

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

/* ===== ORDENAMIENTO DINÁMICO ===== */
document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const columnaClickeada = th.getAttribute('data-column');
        ordenarTabla(columnaClickeada);
    });
});

function ordenarTabla(columna) {
    if (columnaActual === columna) {
        ordenAscendente = !ordenAscendente;
    } else {
        columnaActual = columna;
        ordenAscendente = true;
    }

    const pesoPrioridad = { 'critica': 4, 'alta': 3, 'media': 2, 'baja': 1 };
    const pesoEstado = { 'Resuelto': 3, 'En proceso': 2, 'Abierto': 1 };

    tickets.sort((a, b) => {
        let valorA = a[columna];
        let valorB = b[columna];

        if (columna === 'prioridad') {
            valorA = pesoPrioridad[valorA];
            valorB = pesoPrioridad[valorB];
        } else if (columna === 'estado') {
            valorA = pesoEstado[valorA];
            valorB = pesoEstado[valorB];
        } else if (typeof valorA === 'string') {
            valorA = valorA.toLowerCase();
            valorB = valorB.toLowerCase();
        }

        if (valorA < valorB) return ordenAscendente ? -1 : 1;
        if (valorA > valorB) return ordenAscendente ? 1 : -1;
        return 0;
    });

    cargar(false); // Renderizar sin recalcular el orden por defecto
}

/* ===== CARGAR TABLA Y DASHBOARD ===== */
function cargar(resetSort = true) {
    let tbody = document.getElementById("ticketsBody");
    tbody.innerHTML = "";

    let abiertos = 0, proceso = 0, resueltos = 0;

    tickets.forEach((t, i) => {
        let tr = document.createElement("tr");
        let clasePrioridad = `badge badge-${t.prioridad}`;

        tr.innerHTML = `
        <td><strong>${t.id}</strong></td>
        <td>${t.asunto}</td>
        <td>${t.categoria}</td>
        <td><span class="${clasePrioridad}">${formatearTexto(t.prioridad)}</span></td>
        <td>${t.tecnico}</td>
        <td>
            <select class="select-estado" onchange="cambiarEstado('${t.id}', this.value)">
                <option ${t.estado=="Abierto" ? "selected" : ""}>Abierto</option>
                <option ${t.estado=="En proceso" ? "selected" : ""}>En proceso</option>
                <option ${t.estado=="Resuelto" ? "selected" : ""}>Resuelto</option>
            </select>
        </td>
        <td>
            <button class="btn-editar" onclick="cargarDatosEdicion('${t.id}')">✏️</button>
            <button class="btn-delete" onclick="eliminar('${t.id}')">🗑️</button>
        </td>
        `;

        tbody.appendChild(tr);

        if (t.estado == "Abierto") abiertos++;
        else if (t.estado == "En proceso") proceso++;
        else resueltos++;
    });

    document.getElementById("abiertos").innerText = abiertos;
    document.getElementById("proceso").innerText = proceso;
    document.getElementById("resueltos").innerText = resueltos;
}

/* ===== UTILIDADES ===== */
function cambiarEstado(id, estado) {
    let ticket = tickets.find(t => t.id === id);
    if (ticket) ticket.estado = estado;
    guardarData();
    cargar(false);
}

function eliminar(id) {
    if(confirm("¿Seguro que deseas eliminar este ticket?")) {
        tickets = tickets.filter(t => t.id !== id);
        guardarData();
        cargar();
    }
}

function guardarData() {
    localStorage.setItem("tickets", JSON.stringify(tickets));
}

function formatearTexto(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mostrarMensaje(texto) {
    let msg = document.createElement("div");
    msg.innerText = texto;
    msg.style.position = "fixed";
    msg.style.bottom = "20px";
    msg.style.right = "20px";
    msg.style.background = "#27ae60";
    msg.style.color = "white";
    msg.style.padding = "10px 20px";
    msg.style.borderRadius = "5px";
    msg.style.boxShadow = "0px 2px 10px rgba(0,0,0,0.2)";
    msg.style.zIndex = "1000";

    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

/* ===== INICIO ===== */
iniciarApp();