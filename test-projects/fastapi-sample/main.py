from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()


class Item(BaseModel):
    id: int
    name: str
    description: str | None = None
    price: float


items_db: List[Item] = []


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/items", response_model=List[Item])
async def list_items():
    return items_db


@app.post("/items", response_model=Item)
async def create_item(item: Item):
    items_db.append(item)
    return item


@app.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: int):
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")
