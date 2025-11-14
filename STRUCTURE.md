# 📁 Estructura del Proyecto

## Arquitectura Clean Code

Este proyecto sigue principios de Clean Code con una estructura modular y separación de responsabilidades.

```
pomodoro-astro/
├── src/
│   ├── layouts/
│   │   └── Layout.astro           # Layout base con estilos globales
│   │
│   ├── components/                # Componentes UI reutilizables
│   │   ├── Header.astro           # Encabezado con título
│   │   ├── IllustrationPanel.astro # Panel de ilustraciones dinámicas
│   │   ├── CycleIndicator.astro   # Indicador visual de ciclo (4 puntos)
│   │   ├── ModeSelector.astro     # Selector de modos (Pomodoro/Focus Largo)
│   │   ├── AutoModeToggle.astro   # Toggle para modo automático
│   │   ├── Timer.astro            # Reloj circular con progreso
│   │   ├── SessionControls.astro  # Botones de control (Iniciar/Saltar/Reiniciar)
│   │   └── HistoryPanel.astro     # Panel de historial y estadísticas
│   │
│   ├── scripts/
│   │   └── pomodoroTimer.js       # Lógica principal del timer (class-based)
│   │
│   └── pages/
│       └── index.astro            # Página principal (composición de componentes)
│
├── public/
│   ├── audio/                     # Archivos de audio
│   │   ├── Alarm Clock.mp3
│   │   └── Beep Short.mp3
│   └── image/                     # Ilustraciones
│       ├── 01.jpg
│       ├── 02.jpg
│       └── 03.jpg
│
└── STRUCTURE.md                   # Este archivo
```

## 🏗️ Principios Aplicados

### 1. **Separación de Responsabilidades**
- **Layout**: Estructura HTML y estilos globales
- **Components**: UI components auto-contenidos con sus propios estilos
- **Scripts**: Lógica de negocio separada de la presentación
- **Pages**: Composición de componentes

### 2. **Componentes Modulares**
Cada componente tiene:
- ✅ Una sola responsabilidad
- ✅ Estilos encapsulados (scoped)
- ✅ Nombres descriptivos
- ✅ Independencia (bajo acoplamiento)

### 3. **Código Mantenible**
```javascript
// pomodoroTimer.js está estructurado con:
- Constructor claro
- Métodos bien nombrados y documentados
- Separación de concerns (UI, estado, historial)
- Comentarios descriptivos
```

## 🎯 Beneficios de esta Estructura

### ✨ Fácil de Modificar
```astro
<!-- Cambiar el header es tan simple como -->
<Header /> <!-- Editar solo Header.astro -->
```

### 🔧 Fácil de Testear
Cada componente puede ser probado de forma aislada.

### 📦 Reutilizable
Los componentes pueden usarse en otras páginas:
```astro
---
import Timer from '../components/Timer.astro';
---
<Timer /> <!-- Funciona en cualquier página -->
```

### 🚀 Escalable
Agregar nuevas funciones es sencillo:
- Nuevo componente → Nueva funcionalidad
- Sin tocar código existente
- Principio Open/Closed

## 📖 Cómo Trabajar con Esta Estructura

### Modificar Estilos de un Componente
```bash
# Edita el archivo del componente específico
src/components/Timer.astro  # Solo los estilos del timer
```

### Agregar Nueva Funcionalidad
```bash
# 1. Crea un nuevo componente
src/components/NewFeature.astro

# 2. Impórtalo en index.astro
import NewFeature from '../components/NewFeature.astro';

# 3. Úsalo
<NewFeature />
```

### Modificar Lógica del Timer
```bash
# Toda la lógica está en un solo lugar
src/scripts/pomodoroTimer.js
```

## 🎨 Estilos

### Variables CSS Globales
Definidas en `Layout.astro`:
```css
--bg-primary: #0d1117;
--accent-pomodoro: #ef4444;
/* etc... */
```

### Estilos Componentizados
Cada componente tiene sus propios estilos scoped que no afectan otros componentes.

## 🔄 Flujo de Datos

```
index.astro (Composición)
    ↓
Components (UI)
    ↓
pomodoroTimer.js (Lógica)
    ↓
localStorage (Persistencia)
```

## 📝 Notas para Desarrollo

- **Nuevos componentes**: Crear en `src/components/`
- **Estilos globales**: Agregar en `src/layouts/Layout.astro`
- **Lógica de negocio**: Extender `pomodoroTimer.js`
- **Assets**: Colocar en `public/`

---

**Estructura creada siguiendo Clean Code & Component-Based Architecture**
