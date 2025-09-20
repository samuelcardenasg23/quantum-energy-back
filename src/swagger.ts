import swaggerJSDoc from "swagger-jsdoc";

// Puedes usar process.env.BASE_URL si usas dotenv
const SERVER_URL = process.env.BASE_URL || "http://localhost:3000";

// Definición principal de Swagger
const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "Quantum Energy API",
        version: "1.0.0",
        description: "Quantum Energy API documentation.",
    },
    servers: [{ url: SERVER_URL }],
    tags: [
        { name: "Auth", description: "Authentication and profile" },
        { name: "Users", description: "User management (self-only for item actions)" },
        { name: "Offers", description: "CRUD for energy offers" },
        { name: "Orders", description: "Orders lifecycle and queries" },
        { name: "Markets", description: "Market operations and simulations" },
        { name: "Prices", description: "Provider price per kWh timeline" },
        { name: "Productions", description: "Energy production/consumption records" },
    ],
    components: {
        securitySchemes: {
            BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        responses: {
            UnauthorizedError: {
                description: "Unauthorized",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        examples: {
                            accessDenied: { value: { message: "Access denied" } },
                            invalidToken: { value: { message: "Invalid token" } },
                            userNotFound: { value: { message: "User not found" } },
                        },
                    },
                },
            },
            ForbiddenError: {
                description: "Forbidden",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                        examples: {
                            forbidden: { value: { message: "Forbidden" } },
                        },
                    },
                },
            },
        },
        schemas: {
            // ===== Common / Errors =====
            Error: {
                type: "object",
                properties: { message: { type: "string", example: "Error message" } },
                required: ["message"],
            },

            // ===== Users / Auth =====
            UserBrief: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 42 },
                    email: { type: "string", format: "email", example: "user@mail.com" },
                    name: { type: "string", example: "Gabriel" },
                    user_role: { type: "string", example: "prosumidor" },
                },
                required: ["id", "email"],
            },
            User: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Gabriel" },
                    email: { type: "string", format: "email", example: "user@mail.com" },
                    location: { type: "string", example: "AR-BUE" },
                    user_role: {
                        type: "string",
                        enum: ["admin", "prosumidor", "generador", "consumer"],
                        example: "prosumidor",
                    },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    deleted_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "name", "email", "user_role", "created_at"],
            },
            RegisterDTO: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    name: { type: "string" },
                },
                required: ["email", "password", "name"],
            },
            LoginDTO: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                },
                required: ["email", "password"],
            },
            LoginResponse: {
                type: "object",
                properties: { token: { type: "string", example: "eyJhbGciOi..." } },
                required: ["token"],
            },
            UpdateUserDTO: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    location: { type: "string" },
                    user_role: {
                        type: "string",
                        enum: ["admin", "prosumidor", "generador", "consumer"],
                    },
                },
            },
            PaginatedUsers: {
                type: "object",
                properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
                required: ["data", "pagination"],
            },

            // ===== Offers =====
            Offer: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    user: { $ref: "#/components/schemas/UserBrief" },
                    total_amount_kwh: { type: "number", example: 120 },
                    current_amount_kwh: { type: "number", example: 120 },
                    price_kwh: { type: "number", example: 0.18 },
                    offer_status: {
                        type: "string",
                        enum: ["available", "unavailable"],
                        example: "available",
                    },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    deleted_at: { type: "string", format: "date-time", nullable: true },
                },
                required: [
                    "id",
                    "user",
                    "total_amount_kwh",
                    "current_amount_kwh",
                    "price_kwh",
                    "offer_status",
                ],
            },
            CreateOfferDTO: {
                type: "object",
                properties: {
                    total_amount_kwh: { type: "number" },
                    current_amount_kwh: { type: "number" },
                    price_kwh: { type: "number" },
                },
                required: ["total_amount_kwh", "current_amount_kwh", "price_kwh"],
            },
            UpdateOfferDTO: {
                type: "object",
                properties: {
                    total_amount_kwh: { type: "number" },
                    current_amount_kwh: { type: "number" },
                    price_kwh: { type: "number" },
                    offer_status: { type: "string", enum: ["available", "unavailable"] },
                },
            },
            PaginationMeta: {
                type: "object",
                properties: {
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 10 },
                    total: { type: "integer", example: 37 },
                    pages: { type: "integer", example: 4 },
                },
                required: ["page", "limit", "total", "pages"],
            },
            PaginatedOffers: {
                type: "object",
                properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Offer" } },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
                required: ["data", "pagination"],
            },

            // ===== Orders =====
            Order: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 101 },
                    user: { $ref: "#/components/schemas/UserBrief" }, // buyer
                    offer: { $ref: "#/components/schemas/Offer" },
                    quantity_kwh: { type: "number", example: 50 },
                    total_price: { type: "number", example: 9.5 },
                    status: {
                        type: "string",
                        enum: ["created", "processed", "cancelled", "completed"],
                        example: "created",
                    },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    deleted_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "user", "offer", "quantity_kwh", "total_price"],
            },
            CreateOrderDTO: {
                type: "object",
                properties: {
                    offer_id: { type: "integer" },
                    quantity_kwh: { type: "number", minimum: 0.0001 },
                },
                required: ["offer_id", "quantity_kwh"],
            },
            UpdateOrderDTO: {
                type: "object",
                properties: {
                    quantity_kwh: { type: "number", minimum: 0.0001 },
                    status: {
                        type: "string",
                        enum: ["created", "processed", "cancelled", "completed"],
                    },
                },
            },
            PaginatedOrders: {
                type: "object",
                properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Order" } },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
                required: ["data", "pagination"],
            },

            // ===== Markets / Simulation =====
            SimulationSummary: {
                type: "object",
                properties: {
                    offers_processed: { type: "integer", example: 5 },
                    total_energy_purchased_kwh: { type: "number", example: 1234.5 },
                    total_cost: { type: "number", example: 987.65 },
                    provider_price_used: { type: "number", example: 0.8 },
                },
                required: [
                    "offers_processed",
                    "total_energy_purchased_kwh",
                    "total_cost",
                    "provider_price_used",
                ],
            },
            SimulationResponse: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Simulated purchase completed" },
                    summary: { $ref: "#/components/schemas/SimulationSummary" },
                },
                required: ["message", "summary"],
            },

            // ===== Prices =====
            Price: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 7 },
                    provider_name: { type: "string", example: "MainProvider" },
                    price_kwh: { type: "number", example: 0.22 },
                    price_time: {
                        type: "string",
                        format: "date-time",
                        example: "2025-09-20T10:00:00Z",
                    },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    deleted_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "provider_name", "price_kwh", "price_time"],
            },
            CreatePriceDTO: {
                type: "object",
                properties: {
                    provider_name: { type: "string" },
                    price_kwh: { type: "number" },
                    price_time: { type: "string", format: "date-time" },
                },
                required: ["provider_name", "price_kwh", "price_time"],
            },
            UpdatePriceDTO: {
                type: "object",
                properties: {
                    provider_name: { type: "string" },
                    price_kwh: { type: "number" },
                    price_time: { type: "string", format: "date-time" },
                },
            },
            PaginatedPrices: {
                type: "object",
                properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Price" } },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
                required: ["data", "pagination"],
            },

            // ===== Productions =====
            Production: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 15 },
                    user: { $ref: "#/components/schemas/UserBrief" },
                    energy_produced_kwh: { type: "number", example: 200 },
                    energy_consumed_kwh: { type: "number", example: 50 },
                    used_kwh: { type: "number", example: 100 },
                    consumed_kwh: { type: "number", example: 30 },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                    deleted_at: { type: "string", format: "date-time", nullable: true },
                },
                required: ["id", "user", "energy_produced_kwh", "energy_consumed_kwh"],
            },
            ProductionWithComputed: {
                allOf: [
                    { $ref: "#/components/schemas/Production" },
                    {
                        type: "object",
                        properties: {
                            excedente_kwh: { type: "number", example: 150 },
                            available_excedente_kwh: { type: "number", example: 20 },
                        },
                    },
                ],
            },
            ProductionListItem: {
                allOf: [
                    { $ref: "#/components/schemas/Production" },
                    {
                        type: "object",
                        properties: {
                            net_production_kwh: { type: "number", example: 150 },
                            available_excedente_kwh: { type: "number", example: 20 },
                        },
                    },
                ],
            },
            ProductionsSummary: {
                type: "object",
                properties: {
                    total_produced: { type: "number", example: 1200 },
                    total_consumed: { type: "number", example: 430 },
                    net_production: { type: "number", example: 770 },
                    used_excedente: { type: "number", example: 500 },
                    consumed_excedente: { type: "number", example: 250 },
                    available_excedente: { type: "number", example: 20 },
                },
                required: [
                    "total_produced",
                    "total_consumed",
                    "net_production",
                    "used_excedente",
                    "consumed_excedente",
                    "available_excedente",
                ],
            },
            ProductionsListResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProductionListItem" },
                    },
                    summary: { $ref: "#/components/schemas/ProductionsSummary" },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
                required: ["data", "summary", "pagination"],
            },
        },
    },
    // NOTA: no fijamos "security" global para no bloquear endpoints públicos como GET /prices.
};
// Exporta el spec generado
export const swaggerSpec = swaggerJSDoc({
    definition: swaggerDefinition,
    apis: ["./src/**/*.ts"], // Asegúrate que esta ruta es correcta
});
