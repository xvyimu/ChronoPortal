#!/usr/bin/env python3
"""
Tests for backfill-embeddings.py generate_embedding_text() function.

This test does NOT load sentence-transformers; it extracts the function
as a pure string transformation test.
"""

import os, sys, json
import importlib.util

# Add scripts dir to path so the import works
_SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, _SCRIPTS_DIR)

# Set dummy env vars so backfill module can import without RuntimeError
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY_PROD"] = "test-key"

# Import via importlib because the file is named backfill-embeddings.py (hyphen)
_backfill_path = os.path.join(_SCRIPTS_DIR, "backfill-embeddings.py")
_spec = importlib.util.spec_from_file_location("backfill_embeddings", _backfill_path)
backfill = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(backfill)
generate_embedding_text = backfill.generate_embedding_text


class TestGenerateEmbeddingText:
    """Unit tests for the embedding text generation function."""

    def test_title_description_and_category(self):
        text = generate_embedding_text({
            "title": "React",
            "description": "A JavaScript library for building user interfaces",
            "nav_categories": {"name": "前端框架"},
        })
        assert text == "React A JavaScript library for building user interfaces [前端框架]"

    def test_title_only_no_description(self):
        text = generate_embedding_text({
            "title": "Vue.js",
            "description": None,
            "nav_categories": {"name": "前端框架"},
        })
        assert text == "Vue.js [前端框架]"

    def test_title_only_no_category(self):
        text = generate_embedding_text({
            "title": "Python",
            "description": "Popular programming language",
            "nav_categories": None,
        })
        assert text == "Python Popular programming language"

    def test_empty_description_and_no_category(self):
        text = generate_embedding_text({
            "title": "Go",
            "description": "",
            "nav_categories": None,
        })
        assert text == "Go"

    def test_category_is_empty_dict(self):
        text = generate_embedding_text({
            "title": "Rust",
            "description": "Systems programming",
            "nav_categories": {},
        })
        assert text == "Rust Systems programming"

    def test_category_missing_name_key(self):
        text = generate_embedding_text({
            "title": "Deno",
            "description": "Runtime",
            "nav_categories": {"slug": "runtime"},
        })
        assert text == "Deno Runtime"

    def test_title_is_empty(self):
        text = generate_embedding_text({
            "title": "",
            "description": "desc",
            "nav_categories": {"name": "cat"},
        })
        assert text == " desc [cat]"

    def test_all_fields_maximal(self):
        """Maximal case: long title, long description, category."""
        text = generate_embedding_text({
            "title": "A very long title for a programming tool that does many things",
            "description": "This tool helps developers write better code faster with AI assistance",
            "nav_categories": {"name": "开发工具"},
        })
        assert "[开发工具]" in text
        assert text.startswith("A very long title")

    def test_backward_compatible_no_category_field(self):
        """Old records without nav_categories field should still work."""
        text = generate_embedding_text({
            "title": "Test",
            "description": "desc",
        })
        assert text == "Test desc"

    def test_nav_categories_is_string_not_dict(self):
        """Edge case: nav_categories is not a dict (should be safe)."""
        text = generate_embedding_text({
            "title": "Test",
            "description": "desc",
            "nav_categories": "oops",
        })
        assert text == "Test desc"