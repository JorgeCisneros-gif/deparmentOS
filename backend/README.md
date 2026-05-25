# Edify Backend API

Backend NestJS para gestión de edificios multifamiliares — cuotas de agua, luz, internet y limpieza.

## Stack

- **Framework**: NestJS + Fastify
- **Base de datos**: PostgreSQL (edify_core)
- **ORM**: TypeORM
- **Auth**: JWT (access token 7d + refresh token 30d)
- **OCR medidores**: Claude API (Anthropic Vision)
- **Docs**: Swagger en `/docs`

---

## Setup rápido

### 1. Levantar la BD con Docker

```bash
# En la carpeta donde tienes docker-compose.yml e init.sql
docker compose up -d

# Aplicar el patch de autenticación (tablas users y meter_images)
docker exec -i edify_db psql -U edify_user -d edify_core < src/database/auth-patch.sql
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env y colocar tu ANTHROPIC_API_KEY
```

### 4. Crear usuario supervisor inicial

```bash
# Conectarse a la BD y ejecutar:
docker exec -it edify_db psql -U edify_user -d edify_core -c "
INSERT INTO users (email, password_hash, role) VALUES ('supervisor@edify.com','\$2b\$10\$K.0HwpsoPDlmqGfJ3fMkU.0PxQ.B9L7R9XqJlFJOhQKH2.FPzTrS','supervisor');"
# Password por defecto: Admin@1234  (cambiar en producción)
```

### 5. Arrancar en desarrollo

```bash
npm run start:dev
```

---

## 📋 Listado completo de APIs

### Auth
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/v1/auth/login` | Público | Login → devuelve `access_token` + `refresh_token` |
| POST | `/api/v1/auth/refresh` | Público | Renovar access_token |
| POST | `/api/v1/auth/logout` | Auth | Cerrar sesión |
| GET  | `/api/v1/auth/me` | Auth | Perfil del usuario logueado |

### Users
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST  | `/api/v1/users` | Supervisor | Crear usuario |
| GET   | `/api/v1/users` | Supervisor | Listar usuarios (`?role=propietario`) |
| GET   | `/api/v1/users/:id` | Supervisor | Ver usuario |
| PATCH | `/api/v1/users/:id` | Supervisor | Actualizar usuario |
| PATCH | `/api/v1/users/:id/deactivate` | Supervisor | Desactivar usuario |
| PATCH | `/api/v1/users/me/change-password` | Auth | Cambiar contraseña propia |

### Buildings
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST   | `/api/v1/buildings` | Supervisor | Crear edificio |
| GET    | `/api/v1/buildings` | Supervisor | Listar edificios |
| GET    | `/api/v1/buildings/:id` | Supervisor | Ver edificio con deptos y servicios |
| PATCH  | `/api/v1/buildings/:id` | Supervisor | Actualizar edificio |
| DELETE | `/api/v1/buildings/:id` | Supervisor | Eliminar edificio |

### Departments
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST  | `/api/v1/departments` | Supervisor | Crear departamento |
| GET   | `/api/v1/departments` | Auth | Listar deptos (`?buildingId=...`) |
| GET   | `/api/v1/departments/:id` | Auth | Ver departamento |
| PATCH | `/api/v1/departments/:id` | Supervisor | Actualizar departamento |

### Services
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST  | `/api/v1/services` | Supervisor | Crear servicio (agua/luz/internet/limpieza) |
| GET   | `/api/v1/services` | Supervisor | Listar servicios (`?buildingId=...`) |
| GET   | `/api/v1/services/:id` | Supervisor | Ver servicio |
| PATCH | `/api/v1/services/:id` | Supervisor | Actualizar servicio |

### Receipts (Facturas del proveedor)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST  | `/api/v1/receipts` | Supervisor | Registrar factura (con lecturas del medidor general para agua) |
| GET   | `/api/v1/receipts` | Auth | Listar recibos (`?serviceId=&year=&month=`) |
| GET   | `/api/v1/receipts/:id` | Auth | Ver recibo — incluye `precio_m3` calculado automáticamente |
| PATCH | `/api/v1/receipts/:id` | Supervisor | Actualizar recibo |

### Readings (Mediciones de medidores)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/v1/readings` | Supervisor | Ingresar medición manual |
| GET  | `/api/v1/readings` | Auth | Listar mediciones (`?receiptId=&deptId=`) |
| GET  | `/api/v1/readings/:id` | Auth | Ver medición |
| PATCH | `/api/v1/readings/:id` | Supervisor | Corregir medición |
| GET  | `/api/v1/readings/history/:deptId` | Auth | 📊 Historial consumo agua de un depto |
| **POST** | **`/api/v1/readings/ocr`** | **Supervisor** | **📸 Subir foto del medidor → OCR automático** |
| **POST** | **`/api/v1/readings/confirm-ocr`** | **Supervisor** | **✅ Confirmar lectura OCR y guardar medición** |
| POST | `/api/v1/readings/housekeeping` | Supervisor | 🗑️ Eliminar imágenes vencidas (> 1 año) |

### Fees (Cuotas mensuales)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| **POST** | **`/api/v1/fees/calculate`** | **Supervisor** | **⚡ Calcular cuotas del período para todos los deptos** |
| GET  | `/api/v1/fees` | Auth | Listar cuotas (`?deptId=&year=&month=&status=pendiente`) |
| GET  | `/api/v1/fees/pending` | Supervisor | Resumen pendientes del mes |
| GET  | `/api/v1/fees/:id` | Auth | Ver cuota con desglose completo |
| PATCH | `/api/v1/fees/:id/status` | Supervisor | Actualizar estado de pago |

### Payments (Pagos)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/api/v1/payments` | Supervisor | Registrar pago (actualiza status de cuota automáticamente) |
| GET  | `/api/v1/payments` | Supervisor | Listar pagos (`?feeId=&ownerId=`) |
| GET  | `/api/v1/payments/pending` | Supervisor | Saldo pendiente por edificio y período |
| GET  | `/api/v1/payments/:id` | Supervisor | Ver pago |

---

## 🔄 Flujo mensual de uso

```
1. Registrar facturas del proveedor
   POST /receipts  ← factura Sedapal (con lecturas del medidor general)
   POST /receipts  ← factura Enel (luz)
   POST /receipts  ← factura Internet
   POST /receipts  ← factura Limpieza

2. Fotografiar y registrar medidores de cada depto
   POST /readings/ocr          ← subir foto del depto 201
   POST /readings/confirm-ocr  ← confirmar lectura
   ... repetir para cada depto (202, 301, 302, ...)

3. Calcular cuotas del período
   POST /fees/calculate  ← calcula automáticamente todos los deptos

4. Ver resumen de pendientes
   GET /fees/pending?buildingId=...&month=3&year=2024

5. Registrar pagos
   POST /payments  ← cuando el propietario paga

6. El propietario ve su historial
   GET /readings/history/:deptId  ← consumo mensual de agua
   GET /fees?deptId=...           ← sus cuotas
```

---

## 🔐 Autenticación

Todas las rutas (excepto `/auth/login` y `/auth/refresh`) requieren:

```
Authorization: Bearer <access_token>
```

### Ejemplo login:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supervisor@edify.com","password":"Admin@1234"}'
```

### Ejemplo OCR:
```bash
curl -X POST http://localhost:3000/api/v1/readings/ocr \
  -H "Authorization: Bearer <token>" \
  -F "image=@/ruta/foto_medidor.jpg" \
  -F "departamentoId=<uuid>" \
  -F "reciboId=<uuid>"
```

---

## Estructura del proyecto

```
src/
├── auth/               # Login, JWT, guards, estrategia passport
│   ├── guards/         # JwtAuthGuard, RolesGuard
│   ├── decorators/     # @Roles()
│   └── strategies/     # JwtStrategy
├── users/              # CRUD usuarios (supervisores y propietarios)
├── buildings/          # CRUD edificios
├── departments/        # CRUD departamentos
├── services/           # Configuración de servicios (agua/luz/etc.)
├── receipts/           # Facturas del proveedor
├── readings/           # Mediciones + OCR de imágenes de medidores
│   ├── ocr.service.ts  # Llama a Claude API para leer el medidor
│   └── ...
├── fees/               # Cálculo y consulta de cuotas mensuales
├── payments/           # Registro de pagos
├── common/
│   └── filters/        # Filtro global de excepciones
└── database/
    └── auth-patch.sql  # Tablas users y meter_images
```
