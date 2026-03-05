import pytest
from myapp.models import Article


@pytest.mark.django_db
def test_article_creation():
    """Test creating an article."""
    article = Article.objects.create(
        title="Test Article",
        content="This is a test article."
    )
    assert article.title == "Test Article"
    assert str(article) == "Test Article"


@pytest.mark.django_db
def test_article_timestamps():
    """Test that timestamps are set automatically."""
    article = Article.objects.create(
        title="Test",
        content="Content"
    )
    assert article.created_at is not None
    assert article.updated_at is not None
