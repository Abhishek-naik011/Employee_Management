const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL 
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    })
    : new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

pool.connect()
    .then(client => {
        console.log('✅ Successfully connected to PostgreSQL.');
        client.release();
    })
    .catch(err => {
        console.error('❌ PostgreSQL connection failed:', err.message);
    });

module.exports = pool;