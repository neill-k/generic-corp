# Configuration file for the Sphinx documentation builder.

project = "Generic Corp"
copyright = "2026, Generic Corp Team"
author = "Generic Corp Team"

extensions = [
    "myst_parser",
    "sphinx.ext.autodoc",
    "sphinx.ext.viewcode",
]

# MyST parser settings (allows Markdown files)
myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "tasklist",
]
source_suffix = {
    ".rst": "restructuredtext",
    ".md": "markdown",
}

# Use index.md as root (not index.rst)
root_doc = "index"

# Theme
html_theme = "sphinx_rtd_theme"
html_theme_options = {
    "navigation_depth": 3,
    "collapse_navigation": True,
    "sticky_navigation": True,
    "includehidden": True,
    "titles_only": True,
}

# General settings
exclude_patterns = [
    "_build",
    "plans",
    "solutions",
    "ux-specs-*",
    "CLAUDE_CODE_INTEGRATION_ARCHITECTURE.md",
    "agent-workflow-builder.md",
]
