// database.js - SQLite database service for parent settings
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DatabaseService {
    constructor() {
        // Store database in app data directory for persistent storage
        const userDataPath = app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'yesbut-settings.db');
        this.db = null;
    }

    async initializeDatabase() {
        try {
            // Initialize sql.js
            const SQL = await initSqlJs();
            
            // Try to load existing database file
            let dbData = null;
            if (fs.existsSync(this.dbPath)) {
                dbData = fs.readFileSync(this.dbPath);
            }
            
            // Create database instance
            this.db = new SQL.Database(dbData);
            
            // Create tables and initialize default data
            this.createTables();
            this.initializeDefaultData();
            
            // Save to disk
            this.saveDatabase();
            
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    saveDatabase() {
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    createTables() {
        // Create parent_settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS parent_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pin TEXT NOT NULL DEFAULT '0000',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create child_profile table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS child_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                age INTEGER,
                gender TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create interests table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS interests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `);

        // Create child_interests junction table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS child_interests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interest_id INTEGER,
                selected BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (interest_id) REFERENCES interests (id)
            )
        `);

        // Create emergency_unlocks table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS emergency_unlocks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    initializeDefaultData() {
        // Check if parent settings exist, if not create with default PIN
        const existingSettings = this.db.exec('SELECT * FROM parent_settings LIMIT 1');
        if (existingSettings.length === 0 || existingSettings[0].values.length === 0) {
            this.db.exec("INSERT INTO parent_settings (pin) VALUES ('0000')");
        }

        // Check if child profile exists, if not create empty one
        const existingProfile = this.db.exec('SELECT * FROM child_profile LIMIT 1');
        if (existingProfile.length === 0 || existingProfile[0].values.length === 0) {
            this.db.exec("INSERT INTO child_profile (age, gender) VALUES (NULL, NULL)");
        }

        // Initialize comprehensive interests list
        const existingInterests = this.db.exec('SELECT COUNT(*) as count FROM interests');
        const interestCount = existingInterests.length > 0 && existingInterests[0].values.length > 0 ? 
            existingInterests[0].values[0][0] : 0;
            
        if (interestCount === 0) {
            const interests = [
                // STEM & Science
                'Science', 'Math', 'Chemistry', 'Physics', 'Biology', 'Astronomy', 'Geology',
                'Technology', 'Engineering', 'Robotics', 'Programming', 'Electronics',
                
                // Arts & Creativity
                'Art', 'Drawing', 'Painting', 'Music', 'Singing', 'Dancing', 'Theater',
                'Photography', 'Creative Writing', 'Poetry', 'Crafts', 'Sculpture',
                
                // Sports & Physical
                'Soccer', 'Basketball', 'Baseball', 'Tennis', 'Swimming', 'Gymnastics',
                'Martial Arts', 'Track and Field', 'Cycling', 'Skateboarding', 'Yoga',
                
                // Nature & Animals
                'Animals', 'Dogs', 'Cats', 'Birds', 'Marine Life', 'Dinosaurs',
                'Nature', 'Gardening', 'Environment', 'Conservation', 'Weather',
                
                // Culture & Learning
                'History', 'Geography', 'Languages', 'Archaeology', 'Anthropology',
                'World Cultures', 'Travel', 'Maps', 'Flags', 'Ancient Civilizations',
                
                // Literature & Stories
                'Reading', 'Books', 'Fantasy', 'Adventure Stories', 'Mystery',
                'Fairy Tales', 'Comics', 'Graphic Novels', 'Mythology', 'Legends',
                
                // Games & Puzzles
                'Board Games', 'Card Games', 'Puzzles', 'Brain Teasers', 'Chess',
                'Video Games', 'Strategy Games', 'Word Games', 'Logic Puzzles',
                
                // Food & Cooking
                'Cooking', 'Baking', 'Food Culture', 'Nutrition', 'Farming',
                
                // Transportation
                'Cars', 'Trains', 'Airplanes', 'Ships', 'Space Travel', 'Motorcycles',
                
                // Social & Community
                'Friendship', 'Family', 'Community Service', 'Leadership',
                'Public Speaking', 'Debate', 'Social Issues'
            ];

            // Insert interests
            interests.forEach(interest => {
                this.db.exec(`INSERT INTO interests (name) VALUES ('${interest.replace(/'/g, "''")}')`);
            });

            // Initialize child_interests with all interests unselected
            const allInterests = this.db.exec('SELECT id FROM interests');
            if (allInterests.length > 0 && allInterests[0].values.length > 0) {
                allInterests[0].values.forEach(row => {
                    const interestId = row[0];
                    this.db.exec(`INSERT INTO child_interests (interest_id, selected) VALUES (${interestId}, 0)`);
                });
            }
        }
    }

    // Parent PIN operations
    verifyPin(pin) {
        try {
            const result = this.db.exec('SELECT pin FROM parent_settings LIMIT 1');
            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values[0][0] === pin;
            }
            return pin === '0000'; // Default PIN
        } catch (error) {
            console.error('Error verifying PIN:', error);
            return false;
        }
    }

    updatePin(newPin) {
        try {
            this.db.exec(`UPDATE parent_settings SET pin = '${newPin}', updated_at = CURRENT_TIMESTAMP`);
            this.saveDatabase();
            return true;
        } catch (error) {
            console.error('Error updating PIN:', error);
            return false;
        }
    }

    getCurrentPin() {
        try {
            const result = this.db.exec('SELECT pin FROM parent_settings LIMIT 1');
            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values[0][0];
            }
            return '0000'; // Default PIN
        } catch (error) {
            console.error('Error getting PIN:', error);
            return '0000';
        }
    }

    // Child profile operations
    getChildProfile() {
        try {
            const result = this.db.exec('SELECT * FROM child_profile LIMIT 1');
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const profile = {};
                columns.forEach((col, index) => {
                    profile[col] = values[index];
                });
                return profile;
            }
            return { age: null, gender: null };
        } catch (error) {
            console.error('Error getting child profile:', error);
            return { age: null, gender: null };
        }
    }

    updateChildProfile(age, gender) {
        try {
            const ageValue = age === null || age === '' ? 'NULL' : age;
            const genderValue = gender === null || gender === '' ? 'NULL' : `'${gender}'`;
            this.db.exec(`
                UPDATE child_profile 
                SET age = ${ageValue}, gender = ${genderValue}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = 1
            `);
            this.saveDatabase();
            return true;
        } catch (error) {
            console.error('Error updating child profile:', error);
            return false;
        }
    }

    // Interest operations
    getAllInterests() {
        try {
            const result = this.db.exec(`
                SELECT i.id, i.name, COALESCE(ci.selected, 0) as selected
                FROM interests i
                LEFT JOIN child_interests ci ON i.id = ci.interest_id
                ORDER BY i.name
            `);
            
            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values.map(row => ({
                    id: row[0],
                    name: row[1],
                    selected: row[2] === 1
                }));
            }
            return [];
        } catch (error) {
            console.error('Error getting interests:', error);
            return [];
        }
    }

    updateInterest(interestId, selected) {
        try {
            const selectedValue = selected ? 1 : 0;
            // First check if record exists
            const exists = this.db.exec(`SELECT id FROM child_interests WHERE interest_id = ${interestId}`);
            
            if (exists.length > 0 && exists[0].values.length > 0) {
                // Update existing record
                this.db.exec(`
                    UPDATE child_interests 
                    SET selected = ${selectedValue} 
                    WHERE interest_id = ${interestId}
                `);
            } else {
                // Insert new record
                this.db.exec(`
                    INSERT INTO child_interests (interest_id, selected) 
                    VALUES (${interestId}, ${selectedValue})
                `);
            }
            this.saveDatabase();
            return true;
        } catch (error) {
            console.error('Error updating interest:', error);
            return false;
        }
    }

    getSelectedInterests() {
        try {
            const result = this.db.exec(`
                SELECT i.name
                FROM interests i
                JOIN child_interests ci ON i.id = ci.interest_id
                WHERE ci.selected = 1
                ORDER BY i.name
            `);
            
            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values.map(row => row[0]);
            }
            return [];
        } catch (error) {
            console.error('Error getting selected interests:', error);
            return [];
        }
    }

    // Emergency unlock tracking
    logEmergencyUnlock() {
        try {
            this.db.exec('INSERT INTO emergency_unlocks (timestamp) VALUES (CURRENT_TIMESTAMP)');
            this.saveDatabase();
        } catch (error) {
            console.error('Error logging emergency unlock:', error);
        }
    }

    getEmergencyUnlockCount() {
        try {
            const result = this.db.exec('SELECT COUNT(*) as count FROM emergency_unlocks');
            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values[0][0];
            }
            return 0;
        } catch (error) {
            console.error('Error getting emergency unlock count:', error);
            return 0;
        }
    }

    // Cleanup
    close() {
        if (this.db) {
            try {
                this.saveDatabase();
                this.db.close();
            } catch (error) {
                console.error('Error closing database:', error);
            }
        }
    }
}

module.exports = DatabaseService;