import math
import json
from js import window
import pyodide

def resolver_enfriamiento(T_0, T_s, k, max_t, num_puntos):
    """
    Calcula los puntos de tiempo y temperatura según la Ley de Enfriamiento de Newton.
    T(t) = T_s + (T_0 - T_s) * e^(-k * t)
    
    Parámetros:
    T_0: Temperatura inicial de la sopa (°C)
    T_s: Temperatura ambiente o del entorno (°C)
    k: Constante de enfriamiento (1/min)
    max_t: Tiempo máximo de la simulación (minutos)
    num_puntos: Número de puntos para la gráfica
    """
    # Conversiones y validaciones de tipos
    T_0 = float(T_0)
    T_s = float(T_s)
    k = float(k)
    max_t = float(max_t)
    num_puntos = int(num_puntos)
    
    tiempos = []
    temperaturas = []
    
    dt = max_t / max(1, num_puntos - 1)
    for i in range(num_puntos):
        t = i * dt
        T = T_s + (T_0 - T_s) * math.exp(-k * t)
        tiempos.append(round(t, 2))
        temperaturas.append(round(T, 2))
        
    resultado = {
        "tiempos": tiempos,
        "temperaturas": temperaturas
    }
    return json.dumps(resultado)

# Exponer la función al contexto de JavaScript
try:
    window.calcularEnfriamientoPython = pyodide.create_proxy(resolver_enfriamiento)
    print("PyScript (Pyodide) cargado: calcularEnfriamientoPython registrado con éxito.")
except Exception as e:
    try:
        from pyscript import ffi
        window.calcularEnfriamientoPython = ffi.create_proxy(resolver_enfriamiento)
        print("PyScript (Modern FFI) cargado: calcularEnfriamientoPython registrado con éxito.")
    except Exception as ex:
        print("No se pudo registrar la función en JS window. Ejecución directa en consola de Python.")
        # Para depuración fuera del navegador
        res = resolver_enfriamiento(100, 25, 0.1, 20, 50)
        print("Test output:", res)
