const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIALS = '!@#$%^&*()-_=+[]{}|;:,.?/~';
const ALL_CHARACTERS = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SPECIALS}`;

const randomIntInclusive = (min, max) => crypto.randomInt(min, max + 1);

const pickCharacter = (characters) => characters[randomIntInclusive(0, characters.length - 1)];

const shuffleCharacters = (characters) => {
    const shuffled = [...characters];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = randomIntInclusive(0, index);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
};

const generateTemporaryPassword = () => {
    const passwordLength = randomIntInclusive(8, 12);
    const passwordCharacters = [
        pickCharacter(UPPERCASE),
        pickCharacter(LOWERCASE),
        pickCharacter(NUMBERS),
        pickCharacter(SPECIALS)
    ];

    while (passwordCharacters.length < passwordLength) {
        passwordCharacters.push(pickCharacter(ALL_CHARACTERS));
    }

    return shuffleCharacters(passwordCharacters).join('');
};

const ensureEmployeeAuthTable = async (executor = pool) => {
    await executor.query(`
        CREATE TABLE IF NOT EXISTS employee_auth_accounts (
            employee_id INTEGER PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255),
            first_login BOOLEAN NOT NULL DEFAULT TRUE,
            password_changed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

const backfillMissingEmployeeAuthAccounts = async (executor = pool) => {
    await executor.query(`
        INSERT INTO employee_auth_accounts (
            employee_id,
            email,
            password_hash,
            first_login,
            password_changed
        )
        SELECT
            e.employee_id,
            e.email,
            e.password_hash,
            COALESCE(e.is_first_login, TRUE),
            CASE
                WHEN e.password_hash IS NULL THEN FALSE
                WHEN COALESCE(e.is_first_login, TRUE) = TRUE THEN FALSE
                ELSE TRUE
            END
        FROM employees e
        LEFT JOIN employee_auth_accounts a ON a.employee_id = e.employee_id
        WHERE a.employee_id IS NULL;
    `);
};

const upsertEmployeeAuthAccount = async (executor, {
    employeeId,
    email,
    passwordHash,
    firstLogin,
    passwordChanged
}) => {
    await executor.query(`
        INSERT INTO employee_auth_accounts (
            employee_id,
            email,
            password_hash,
            first_login,
            password_changed
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (employee_id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            first_login = EXCLUDED.first_login,
            password_changed = EXCLUDED.password_changed,
            updated_at = CURRENT_TIMESTAMP;
    `, [
        employeeId,
        email,
        passwordHash,
        firstLogin,
        passwordChanged
    ]);
};

const syncLegacyEmployeeSecurityColumns = async (executor, {
    employeeId,
    passwordHash,
    firstLogin
}) => {
    await executor.query(`
        UPDATE employees
        SET
            password_hash = $1,
            is_first_login = $2
        WHERE employee_id = $3;
    `, [passwordHash, firstLogin, employeeId]);
};

const setEmployeeTemporaryPassword = async (executor, {
    employeeId,
    email,
    temporaryPassword,
    firstLogin = true,
    passwordChanged = false
}) => {
    const passwordToUse = temporaryPassword || generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(passwordToUse, 10);

    await upsertEmployeeAuthAccount(executor, {
        employeeId,
        email,
        passwordHash,
        firstLogin,
        passwordChanged
    });

    await syncLegacyEmployeeSecurityColumns(executor, {
        employeeId,
        passwordHash,
        firstLogin
    });

    return {
        temporaryPassword: passwordToUse,
        passwordHash
    };
};

const syncEmployeeAuthEmail = async (executor, { employeeId, email }) => {
    await executor.query(`
        INSERT INTO employee_auth_accounts (
            employee_id,
            email,
            password_hash,
            first_login,
            password_changed
        )
        VALUES ($1, $2, NULL, TRUE, FALSE)
        ON CONFLICT (employee_id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = CURRENT_TIMESTAMP;
    `, [employeeId, email]);
};

module.exports = {
    generateTemporaryPassword,
    ensureEmployeeAuthTable,
    backfillMissingEmployeeAuthAccounts,
    upsertEmployeeAuthAccount,
    syncLegacyEmployeeSecurityColumns,
    setEmployeeTemporaryPassword,
    syncEmployeeAuthEmail
};