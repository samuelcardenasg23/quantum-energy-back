import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1758766766814 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "email" character varying(255) NOT NULL,
                "name" character varying(255) NOT NULL,
                "password" character varying(255) NOT NULL,
                "location" character varying(255) NOT NULL,
                "user_role" character varying NOT NULL CHECK ("user_role" IN ('prosumidor', 'consumidor', 'generador')),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_96aac0725512a4648b95a26b5f" PRIMARY KEY ("id")
            )
        `);

        // Create unique index on email
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")
        `);

        // Create energy_price_per_hour table
        await queryRunner.query(`
            CREATE TABLE "energy_price_per_hour" (
                "id" SERIAL NOT NULL,
                "provider_name" character varying(255) NOT NULL,
                "price_kwh" numeric(10,2) NOT NULL,
                "price_time" TIMESTAMP NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_8b3c6b3c3c3c3c3c3c3c3c3c3c" PRIMARY KEY ("id")
            )
        `);

        // Create energy_offers table
        await queryRunner.query(`
            CREATE TABLE "energy_offers" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "total_amount_kwh" numeric(10,2) NOT NULL,
                "current_amount_kwh" numeric(10,2) NOT NULL,
                "price_kwh" numeric(10,2) NOT NULL,
                "offer_status" character varying NOT NULL DEFAULT 'available' CHECK ("offer_status" IN ('available', 'unavailable')),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_4c88e956195bba85977da21b8f" PRIMARY KEY ("id")
            )
        `);

        // Create foreign key for energy_offers
        await queryRunner.query(`
            ALTER TABLE "energy_offers" ADD CONSTRAINT "FK_4c88e956195bba85977da21b8f_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // Create orders table
        await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "offer_id" integer NOT NULL,
                "quantity_kwh" numeric(10,2) NOT NULL,
                "total_price" numeric(10,2) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_4c88e956195bba85977da21b8f_orders" PRIMARY KEY ("id")
            )
        `);

        // Create foreign keys for orders
        await queryRunner.query(`
            ALTER TABLE "orders" ADD CONSTRAINT "FK_4c88e956195bba85977da21b8f_user_orders" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" ADD CONSTRAINT "FK_4c88e956195bba85977da21b8f_offer" FOREIGN KEY ("offer_id") REFERENCES "energy_offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // Create energy_production_consumption table
        await queryRunner.query(`
            CREATE TABLE "energy_production_consumption" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "energy_produced_kwh" numeric(10,2) NOT NULL,
                "energy_consumed_kwh" numeric(10,2) NOT NULL,
                "used_kwh" numeric(10,2) NOT NULL DEFAULT 0,
                "consumed_kwh" numeric(10,2) NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP,
                CONSTRAINT "PK_4c88e956195bba85977da21b8f_epc" PRIMARY KEY ("id")
            )
        `);

        // Create foreign key for energy_production_consumption
        await queryRunner.query(`
            ALTER TABLE "energy_production_consumption" ADD CONSTRAINT "FK_4c88e956195bba85977da21b8f_user_epc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.query(`DROP TABLE "energy_production_consumption"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "energy_offers"`);
        await queryRunner.query(`DROP TABLE "energy_price_per_hour"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
