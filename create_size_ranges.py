import sqlite3

def main():
    db_file = 'inventory.db'
    
    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        
        print("Creating table size_range...")
        cursor.execute("DROP TABLE IF EXISTS size_range;")
        cursor.execute("""
            CREATE TABLE size_range (
                size_range_id INTEGER,
                size_range TEXT,
                size_code TEXT
            );
        """)
        
        print("Populating size ranges from product_master...")
        
        # Using DENSE_RANK to give the same size_range_id to identical size_range strings
        query = """
            INSERT INTO size_range (size_range_id, size_range, size_code)
            SELECT 
                DENSE_RANK() OVER (ORDER BY size_range) AS size_range_id,
                size_range,
                size_code
            FROM (
                SELECT DISTINCT 
                    REPLACE(CAST(DEPT AS TEXT), '.0', '') || '_' || 
                    REPLACE(CAST(CLASS AS TEXT), '.0', '') || '_' || 
                    REPLACE(CAST(SUBCLASS AS TEXT), '.0', '') AS size_range,
                    DIFF_2 AS size_code
                FROM product_master
                WHERE DIFF_2 IS NOT NULL AND DIFF_2 != '' AND DIFF_2 != 'NOSIZE'
            )
            ORDER BY size_range_id, size_code;
        """
        
        cursor.execute(query)
        conn.commit()
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM size_range;")
        count = cursor.fetchone()[0]
        print(f"Successfully created size_range with {count} rows.")
        
        # Let's also print some rows to verify it looks correct
        cursor.execute("SELECT * FROM size_range LIMIT 15;")
        rows = cursor.fetchall()
        print("\nFirst few rows of size_range:")
        for r in rows:
            print(r)

if __name__ == "__main__":
    main()
