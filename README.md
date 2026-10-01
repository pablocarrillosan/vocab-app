# Mi cuaderno

App para apuntar cada día palabras de inglés que no conoces y examinarte de
ellas al final de la semana, seguir un plan de verbos B2 o C1 y repasar la
gramática de B1 con explicaciones y ejercicios. Vue 3 + Vite en el frontend, Supabase
(Postgres + Auth) como backend, con cada usuario viendo solo sus propias
palabras.

## 1. Crear el proyecto de Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto nuevo (la capa gratuita sobra para esto).
2. Ve a **SQL Editor** y pega el contenido de [`supabase/schema.sql`](supabase/schema.sql). Ejecútalo: crea las tablas `words`, `exam_results`, `verb_results`, `verb_stats` y `grammar_progress` con seguridad por fila (cada usuario solo ve las suyas).
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
  data/verbsB2.js los 384 verbos del plan B2 de 8 semanas
  data/verbsC1.js los 480 verbos del plan C1 de 8 semanas (10 al día, con verbos + preposición)
  data/grammarB1.js los 10 bloques del repaso de gramática B1 (explicación y cinco tandas de ejercicios)
  App.vue         áreas "Vocabulario" (Hoy / Palabras), "Verbos" y "Gramática", y el examen
supabase/
  schema.sql      tablas y políticas de seguridad por fila
```

El examen mezcla tres tipos de pregunta: elegir el significado, escribir la
palabra a partir del significado, y rellenar el hueco de la frase de ejemplo
(cuando la palabra tiene una). Las que fallas se repiten con más frecuencia en
el siguiente examen.

Una palabra puede tener varios significados: si apuntas «bank = orilla» cuando
ya tenías «bank = banco», se guarda como un significado más y la lista los
muestra juntos, cada uno con su frase, su categoría (n., v., adj.…), su matiz
opcional («de un río») y su propio contador de fallos. Al apuntar puedes
consultar las acepciones en [dictionaryapi.dev](https://dictionaryapi.dev) para
rellenar la categoría y la frase de ejemplo.

Si ya tenías la base de datos creada antes de esto, vuelve a ejecutar
[`supabase/schema.sql`](supabase/schema.sql) (o solo sus dos líneas
`alter table public.words add column if not exists …`) para añadir las columnas
`pos` y `note`.
