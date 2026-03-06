import pytest
from fastapi.testclient import TestClient
from main import app, items_db, Item

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_items():
    items_db.clear()
    yield


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}


def test_create_item():
    item_data = {
        "id": 1,
        "name": "Test Item",
        "description": "A test item",
        "price": 9.99
    }
    response = client.post("/items", json=item_data)
    assert response.status_code == 200
    assert response.json()["name"] == "Test Item"


def test_list_items():
    item = Item(id=1, name="Item 1", price=10.0)
    items_db.append(item)
    
    response = client.get("/items")
    assert response.status_code == 200
    assert len(response.json()) == 1
