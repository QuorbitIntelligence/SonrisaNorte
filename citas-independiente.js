// ============================================================
// SONRISA NORTE - CLIENTE CITAS INDEPENDIENTE
// Archivo: citas-independiente.js
// Este JavaScript es INDEPENDIENTE del sistema anterior
// ============================================================

// ⚠️ CONFIGURACIÓN - PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT
const URL_API_CITAS = 'PEGA_AQUI_TU_URL_DEL_WEB_APP';

// Horarios disponibles del consultorio
const HORARIOS_DISPONIBLES = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
];

// ==================== FUNCIÓN PRINCIPAL ====================

async function llamarAPICitas(accion, datos = {}) {
    try {
        datos.accion = accion;
        
        console.log('📤 Enviando a API Citas:', accion);
        console.log('📦 Datos:', datos);
        
        const respuesta = await fetch(URL_API_CITAS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datos),
            redirect: 'follow'
        });
        
        if (!respuesta.ok) {
            throw new Error('HTTP ' + respuesta.status);
        }
        
        const resultado = await respuesta.json();
        console.log('✅ Respuesta de API:', resultado);
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error en API Citas:', error);
        return {
            exito: false,
            mensaje: 'Error de conexión: ' + error.message
        };
    }
}

// ==================== GUARDAR CITA ====================

async function guardarCitaIndependiente(formulario) {
    try {
        // Obtener datos del formulario
        const datos = {
            nombre: formulario.nombre.value.trim(),
            email: formulario.email.value.trim(),
            telefono: formulario.telefono.value.trim(),
            servicio: formulario.servicio.value,
            fechaCita: formulario.fechaCita.value,
            horarioCita: formulario.horarioCita.value,
            motivo: formulario.motivo.value.trim(),
            navegador: obtenerInfoNavegador()
        };
        
        console.log('💾 Guardando cita...', datos);
        
        // Validar campos obligatorios
        if (!datos.nombre || !datos.email || !datos.telefono) {
            return {
                exito: false,
                mensaje: 'Por favor completa nombre, email y teléfono'
            };
        }
        
        if (!datos.servicio || !datos.fechaCita || !datos.horarioCita) {
            return {
                exito: false,
                mensaje: 'Por favor selecciona servicio, fecha y horario'
            };
        }
        
        // Validar email
        if (!validarEmail(datos.email)) {
            return {
                exito: false,
                mensaje: 'Por favor ingresa un email válido'
            };
        }
        
        // Llamar a la API
        const resultado = await llamarAPICitas('guardarCita', datos);
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error en guardarCitaIndependiente:', error);
        return {
            exito: false,
            mensaje: 'Error al guardar: ' + error.message
        };
    }
}

// ==================== CONSULTAR HORARIOS OCUPADOS ====================

async function consultarHorariosDisponibles(fecha) {
    try {
        console.log('🕐 Consultando horarios para:', fecha);
        
        const resultado = await llamarAPICitas('consultarHorariosOcupados', { fecha });
        
        if (resultado.exito) {
            const horariosOcupados = resultado.horarios || [];
            const horariosLibres = HORARIOS_DISPONIBLES.filter(
                horario => !horariosOcupados.includes(horario)
            );
            
            return {
                exito: true,
                fecha: fecha,
                horariosOcupados: horariosOcupados,
                horariosLibres: horariosLibres,
                totalOcupados: horariosOcupados.length,
                totalLibres: horariosLibres.length
            };
        }
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Error en consultarHorariosDisponibles:', error);
        return {
            exito: false,
            mensaje: 'Error al consultar horarios: ' + error.message
        };
    }
}

// ==================== RENDERIZAR HORARIOS ====================

function renderizarHorarios(contenedorId, fecha) {
    const contenedor = document.getElementById(contenedorId);
    
    if (!contenedor) {
        console.error('❌ No se encontró el contenedor:', contenedorId);
        return;
    }
    
    if (!fecha) {
        contenedor.innerHTML = `
            <div class="col-span-3 text-center text-gray-500 py-4">
                <i class="fas fa-calendar-day text-3xl mb-2"></i>
                <p>Selecciona una fecha para ver horarios disponibles</p>
            </div>
        `;
        return;
    }
    
    // Mostrar loading
    contenedor.innerHTML = `
        <div class="col-span-3 text-center py-4">
            <div class="spinner mx-auto"></div>
            <p class="text-gray-600 mt-3">Consultando disponibilidad...</p>
        </div>
    `;
    
    // Consultar horarios
    consultarHorariosDisponibles(fecha).then(resultado => {
        if (!resultado.exito) {
            contenedor.innerHTML = `
                <div class="col-span-3 text-center text-red-500 py-4">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p>${resultado.mensaje}</p>
                </div>
            `;
            return;
        }
        
        const horariosOcupados = resultado.horariosOcupados || [];
        contenedor.innerHTML = '';
        
        // Renderizar cada horario
        HORARIOS_DISPONIBLES.forEach(horario => {
            const estaOcupado = horariosOcupados.includes(horario);
            const boton = document.createElement('button');
            boton.type = 'button';
            
            if (estaOcupado) {
                // Horario ocupado
                boton.className = 'horario-btn disabled px-4 py-3 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-400 bg-red-50 cursor-not-allowed';
                boton.innerHTML = `${horario}<br><span class="text-xs">Ocupado</span>`;
                boton.disabled = true;
            } else {
                // Horario disponible
                boton.className = 'horario-btn px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition';
                boton.innerHTML = `${horario}<br><span class="text-xs text-green-600">Disponible</span>`;
                boton.onclick = () => seleccionarHorario(horario, boton);
            }
            
            contenedor.appendChild(boton);
        });
        
        // Agregar resumen
        const resumen = document.createElement('div');
        resumen.className = 'col-span-3 mt-4 p-3 bg-blue-50 rounded-xl text-sm text-center';
        resumen.innerHTML = `
            <i class="fas fa-info-circle text-blue-500 mr-2"></i>
            <span class="font-semibold">${resultado.totalLibres}</span> horarios disponibles de 
            <span class="font-semibold">${HORARIOS_DISPONIBLES.length}</span> totales
        `;
        contenedor.appendChild(resumen);
    });
}

// ==================== SELECCIONAR HORARIO ====================

function seleccionarHorario(horario, botonClickeado) {
    // Quitar selección de todos los botones
    document.querySelectorAll('.horario-btn:not(.disabled)').forEach(btn => {
        btn.classList.remove('selected', 'border-blue-500', 'bg-blue-500', 'text-white');
        btn.classList.add('border-gray-300', 'text-gray-700');
    });
    
    // Marcar el botón clickeado
    botonClickeado.classList.add('selected', 'border-blue-500', 'bg-blue-500', 'text-white');
    botonClickeado.classList.remove('border-gray-300', 'text-gray-700');
    
    // Guardar en campo oculto
    const campoHorario = document.getElementById('horarioCitaSeleccionado');
    if (campoHorario) {
        campoHorario.value = horario;
    }
    
    console.log('✅ Horario seleccionado:', horario);
}

// ==================== UTILIDADES ====================

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function obtenerInfoNavegador() {
    const ua = navigator.userAgent;
    let navegador = 'Desconocido';
    
    if (ua.indexOf('Chrome') > -1) navegador = 'Chrome';
    else if (ua.indexOf('Safari') > -1) navegador = 'Safari';
    else if (ua.indexOf('Firefox') > -1) navegador = 'Firefox';
    else if (ua.indexOf('Edge') > -1) navegador = 'Edge';
    else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) navegador = 'IE';
    
    return navegador;
}

function mostrarMensaje(elementoId, mensaje, tipo = 'exito') {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    
    const claseAlerta = tipo === 'exito' ? 'alert-success' : 'alert-error';
    const icono = tipo === 'exito' ? 'check-circle' : 'exclamation-circle';
    
    elemento.innerHTML = `
        <div class="alert ${claseAlerta}">
            <i class="fas fa-${icono} mr-2"></i>${mensaje}
        </div>
    `;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        elemento.innerHTML = '';
    }, 5000);
}

function formatearFecha(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ==================== HANDLER DEL FORMULARIO ====================

async function manejarEnvioCita(evento) {
    evento.preventDefault();
    
    const formulario = evento.target;
    const btnSubmit = formulario.querySelector('button[type="submit"]');
    const mensajeDiv = document.getElementById('mensajeCita');
    
    // Deshabilitar botón
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';
    }
    
    // Mostrar loading
    if (mensajeDiv) {
        mostrarMensaje('mensajeCita', 'Guardando cita...', 'info');
    }
    
    // Guardar cita
    const resultado = await guardarCitaIndependiente(formulario);
    
    // Re-habilitar botón
    if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-check mr-2"></i>Confirmar Cita';
    }
    
    // Mostrar resultado
    if (resultado.exito) {
        const datos = resultado.datos;
        const mensaje = `
            ✅ <strong>¡Cita agendada exitosamente!</strong><br><br>
            📅 Fecha: ${formatearFecha(datos.fechaCita)}<br>
            🕐 Hora: ${datos.horarioCita}<br>
            📧 Confirmación a: ${datos.email}<br><br>
            <small>ID: ${datos.id}</small>
        `;
        
        mostrarMensaje('mensajeCita', mensaje, 'exito');
        
        // Limpiar formulario
        setTimeout(() => {
            formulario.reset();
            document.getElementById('horariosContainer').innerHTML = '';
        }, 3000);
        
    } else {
        mostrarMensaje('mensajeCita', '❌ ' + resultado.mensaje, 'error');
    }
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🦷 ========================================');
    console.log('   SISTEMA DE CITAS INDEPENDIENTE');
    console.log('🦷 ========================================');
    
    // Verificar configuración
    if (URL_API_CITAS === 'PEGA_AQUI_TU_URL_DEL_WEB_APP') {
        console.error('❌ URL de API no configurada');
        console.error('Edita el archivo y pega tu URL de Google Apps Script');
        return;
    }
    
    console.log('✅ URL configurada');
    console.log('✅ Sistema listo');
    
    // Configurar evento de cambio de fecha
    const campoFecha = document.getElementById('fechaCita');
    if (campoFecha) {
        const hoy = new Date().toISOString().split('T')[0];
        campoFecha.min = hoy;
        
        campoFecha.addEventListener('change', function() {
            const fecha = this.value;
            if (fecha) {
                renderizarHorarios('horariosContainer', fecha);
                // Limpiar selección de horario
                const campoHorario = document.getElementById('horarioCitaSeleccionado');
                if (campoHorario) campoHorario.value = '';
            }
        });
    }
    
    // Configurar formulario
    const formularioCita = document.getElementById('formularioCitaIndependiente');
    if (formularioCita) {
        formularioCita.addEventListener('submit', manejarEnvioCita);
    }
    
    console.log('🦷 ========================================');
});

// ==================== EXPORTS PARA TESTING ====================

// Función de test rápido en consola
window.testAPICitas = async function() {
    console.log('🧪 Probando conexión con API...');
    const resultado = await llamarAPICitas('ping');
    console.log('Resultado:', resultado);
    return resultado;
};

// Exponer funciones globales
window.guardarCitaIndependiente = guardarCitaIndependiente;
window.consultarHorariosDisponibles = consultarHorariosDisponibles;
window.renderizarHorarios = renderizarHorarios;
window.llamarAPICitas = llamarAPICitas;

console.log('✅ Script de citas independiente cargado');
