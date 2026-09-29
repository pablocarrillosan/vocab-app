# Mi vocabulario

App para apuntar cada día palabras de inglés que no conoces y examinarte de
ellas al final de la semana. Vue 3 + Vite en el frontend, Supabase
(Postgres + Auth) como backend, con cada usuario viendo solo sus propias
palabras.

## 1. Crear el proyecto de Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo (la capa gratuita sobra para esto).
2. Ve a **SQL Editor** y pega el contenido de [`supabase/schema.sql`](supabase/schema.sql). Ejecútalo: crea las tablas `words` y `exam_results` con seguridad por fila (cada usuario solo ve las suyas).
3. Ve a **Project Settings → API** y copia la **Project URL** y la clave **anon public**.
4. Ve a **Authentication → Sign In / Providers → Email** y confirma que el inicio de sesión por email (enlace mágico) está activado — lo está por defecto.
5. En **Authentication → URL Configuration**, añade `http://localhost:5173` a las *Redirect URLs* para poder probar en local (cuando despliegues, añade también la URL final).

## 2. Configurar el proyecto en local

```bash
npm install
cp .env.example .env
```

Edita `.env` y pega la URL y la clave anon del paso anterior:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

## 3. Arrancar en local

```bash
npm run dev
```

Abre la URL que te indique (normalmente `http://localhost:5173`), escribe tu
email y entra con el enlace que te llegue. La primera vez tendrás la lista de
palabras vacía; puedes empezar a apuntar directamente.

## 4. Desplegar

Cualquier proveedor de sitios estáticos vale (Vercel, Netlify, Cloudflare
Pages...). Pasos generales:

1. Sube el repositorio a GitHub.
2. Conecta el repositorio en el proveedor; el comando de build es `npm run build` y la carpeta de salida `dist`.
3. Añade las mismas variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en la configuración del proyecto del proveedor.
4. Añade la URL final (por ejemplo `https://tu-app.vercel.app`) a las *Redirect URLs* de Supabase (paso 1.5), o el enlace mágico no podrá volver a la app.

## Estructura

```
src/
  lib/            fechas, comparación de texto y el motor de preguntas del examen
  composables/    sesión (useAuth), palabras (useWords), resultados (useExamResults)
  components/     formulario, filas de palabras, semanas, examen, pantalla de acceso
  App.vue         pestañas "Hoy" / "Palabras" y el examen
supabase/
  schema.sql      tablas y políticas de seguridad por fila
```

El examen mezcla tres tipos de pregunta: elegir el significado, escribir la
palabra a partir del significado, y rellenar el hueco de la frase de ejemplo
(cuando la palabra tiene una). Las que fallas se repiten con más frecuencia en
el siguiente examen.
