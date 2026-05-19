import { query } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function setupUsersDB() {
    console.log('Setting up credentials.users table...');
    
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ users table created (or already exists).');

        // Create default admin user
        const adminEmail = 'admin@example.com';
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        await query(`
            INSERT INTO credentials.users (name, email, password, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;
        `, ['Admin User', adminEmail, adminPassword, 'admin']);
        console.log(`✅ Default admin created: ${adminEmail} / admin123`);

        // Create default standard user
        const userEmail = 'user@example.com';
        const userPassword = await bcrypt.hash('user123', 10);
        
        await query(`
            INSERT INTO credentials.users (name, email, password, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role;
        `, ['Standard User', userEmail, userPassword, 'user']);
        console.log(`✅ Default user created: ${userEmail} / user123`);

        console.log('User setup complete!');
    } catch (error) {
        console.error('Error setting up users DB:', error);
    }
}

setupUsersDB();
