import sqlite3
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = 'inventory.db'

@app.get("/api/products")
def get_products(
    limit: int = 100, 
    offset: int = 0,
    dept: Optional[str] = None,
    class_name: Optional[str] = Query(None, alias="class"),
    subclass: Optional[str] = None,
    item_parent: Optional[str] = None,
    parent_diff_1: Optional[str] = None
):
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        conditions = []
        params = []
        
        if dept:
            conditions.append("DEPT = ?")
            params.append(dept)
        if class_name:
            conditions.append("CLASS = ?")
            params.append(class_name)
        if subclass:
            conditions.append("SUBCLASS = ?")
            params.append(subclass)
        if item_parent:
            conditions.append("ITEM_PARENT = ?")
            params.append(item_parent)
        if parent_diff_1:
            conditions.append("parent_diff_1 = ?")
            params.append(parent_diff_1)
            
        where_clause = ""
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
            
        # Get total count
        cursor.execute(f"SELECT COUNT(*) FROM product_master {where_clause}", params)
        total_count = cursor.fetchone()[0]
        
        # Get data
        query = f"SELECT * FROM product_master {where_clause} LIMIT ? OFFSET ?"
        cursor.execute(query, params + [limit, offset])
        rows = cursor.fetchall()
        
        data = [dict(row) for row in rows]
        
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "data": data
        }

@app.get("/api/filters")
def get_filters(
    dept: Optional[str] = None,
    class_name: Optional[str] = Query(None, alias="class"),
    subclass: Optional[str] = None,
    item_parent: Optional[str] = None
):
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        def get_distinct(column, current_conditions):
            conds = []
            params = []
            for col, val in current_conditions:
                if val is not None and val != "":
                    conds.append(f"{col} = ?")
                    params.append(val)
            
            conds.append(f"{column} IS NOT NULL")
            
            where = " WHERE " + " AND ".join(conds)
                
            cursor.execute(f"SELECT DISTINCT {column} FROM product_master {where} ORDER BY {column}", params)
            return [row[0] for row in cursor.fetchall()]

        depts = get_distinct("DEPT", [])
        classes = get_distinct("CLASS", [("DEPT", dept)])
        subclasses = get_distinct("SUBCLASS", [("DEPT", dept), ("CLASS", class_name)])
        item_parents = get_distinct("ITEM_PARENT", [("DEPT", dept), ("CLASS", class_name), ("SUBCLASS", subclass)])
        parent_diff_1s = get_distinct("parent_diff_1", [("DEPT", dept), ("CLASS", class_name), ("SUBCLASS", subclass), ("ITEM_PARENT", item_parent)])
        
        return {
            "dept": depts,
            "class": classes,
            "subclass": subclasses,
            "item_parent": item_parents,
            "parent_diff_1": parent_diff_1s,
        }

@app.get("/api/size_ranges")
def get_size_ranges(limit: int = 200, offset: int = 0, size_range_id: Optional[int] = None):
    with sqlite3.connect(DB_FILE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        where_clause = ""
        params = []
        
        if size_range_id is not None:
            where_clause = "WHERE size_range_id = ?"
            params.append(size_range_id)
        
        cursor.execute(f"SELECT COUNT(*) FROM size_range {where_clause}", params)
        total_count = cursor.fetchone()[0]
        
        query = f"SELECT * FROM size_range {where_clause} ORDER BY size_range_id, size_code LIMIT ? OFFSET ?"
        cursor.execute(query, params + [limit, offset])
        rows = cursor.fetchall()
        
        data = [dict(row) for row in rows]
        
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "data": data
        }

@app.get("/api/size_range_filters")
def get_size_range_filters():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT size_range_id FROM size_range WHERE size_range_id IS NOT NULL ORDER BY size_range_id")
        return {"size_range_ids": [row[0] for row in cursor.fetchall()]}

# Serve static files for the frontend
app.mount("/", StaticFiles(directory="public", html=True), name="public")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
