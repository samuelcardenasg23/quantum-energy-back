# Backend de Quantum Energy

Una API backend para un sistema de gestión de energía construida con Node.js, TypeScript, Express y TypeORM.

## Características

- Autenticación y autorización de usuarios con JWT
- Gestión de usuarios (operaciones CRUD)
- Gestión de ofertas de energía (operaciones CRUD)
- Integración con base de datos PostgreSQL
- Documentación de API con Swagger
- Limitación de tasa y soporte CORS
- Registro con Winston

## Pila Tecnológica

- **Entorno de ejecución**: Node.js
- **Lenguaje**: TypeScript
- **Framework**: Express.js
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT
- **Documentación**: Swagger
- **Otros**: bcryptjs, cors, express-rate-limit, winston

## Instrucciones de Configuración

### Prerrequisitos

- Node.js (v14 o superior)
- Base de datos PostgreSQL
- npm o yarn

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/samuelcardenasg23/quantum-energy-back.git
   cd quantum-energy-back
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Copia `.env.example` a `.env`
   - Completa los valores requeridos (ver sección Variables de Entorno abajo)

4. Configura la base de datos:
   - Asegúrate de que PostgreSQL esté ejecutándose
   - Crea una base de datos con el nombre especificado en `DB_NAME`
   - La aplicación usa migraciones de TypeORM (synchronize está en false, así que ejecuta migraciones si es necesario)

### Variables de Entorno

Crea un archivo `.env` en el directorio raíz con las siguientes variables:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario_db
DB_PASSWORD=tu_password_db
DB_NAME=quantum_energy
JWT_SECRET=tu_secreto_jwt_aqui
```

- `NODE_ENV`: Modo de entorno (development/production)
- `PORT`: Puerto en el que el servidor se ejecutará
- `DB_HOST`: Host de PostgreSQL
- `DB_PORT`: Puerto de PostgreSQL
- `DB_USER`: Usuario de PostgreSQL
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `DB_NAME`: Nombre de la base de datos PostgreSQL
- `JWT_SECRET`: Clave secreta para la generación de tokens JWT

### Ejecutando el Proyecto

#### Modo Desarrollo
```bash
npm run dev
```
Esto inicia el servidor con nodemon para recarga automática.

#### Construcción para Producción
```bash
npm run build
npm start
```
Compila el código TypeScript e inicia el servidor.

El servidor se ejecutará en `http://localhost:3000` por defecto.

## Endpoints de la API

### Autenticación
- `POST /auth/register` - Registrar un nuevo usuario
- `POST /auth/login` - Iniciar sesión de usuario
- `GET /auth/profile` - Obtener perfil de usuario (requiere autenticación)

### Usuarios
Todas las rutas de usuario requieren autenticación.
- `GET /users` - Obtener todos los usuarios
- `GET /users/:id` - Obtener usuario por ID
- `PUT /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario

### Ofertas
Todas las rutas de ofertas requieren autenticación.
- `GET /offers` - Obtener todas las ofertas
- `GET /offers/:id` - Obtener oferta por ID
- `POST /offers` - Crear nueva oferta (requiere rol 'prosumidor' o 'generador')
- `PUT /offers/:id` - Actualizar oferta
- `DELETE /offers/:id` - Eliminar oferta

### Raíz
- `GET /` - Mensaje de bienvenida

## Entidades de Base de Datos

- **User**: Información de usuario y autenticación
- **EnergyOffer**: Ofertas de energía de productores
- **EnergyPricePerHour**: Precios por hora para energía
- **EnergyProductionConsumption**: Datos de producción y consumo
- **Order**: Órdenes relacionadas con transacciones de energía

## Contribuyendo

1. Haz un fork del repositorio
2. Crea una rama de característica
3. Haz tus cambios
4. Ejecuta pruebas (si las hay)
5. Envía una solicitud de pull