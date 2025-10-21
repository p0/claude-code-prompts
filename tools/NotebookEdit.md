# NotebookEdit

Completely replaces the contents of a specific cell in a Jupyter notebook (.ipynb file) with new source. Jupyter notebooks are interactive documents that combine code, text, and visualizations, commonly used for data analysis and scientific computing. The notebook_path parameter must be an absolute path, not a relative path. The cell_number is 0-indexed. Use edit_mode=insert to add a new cell at the index specified by cell_number. Use edit_mode=delete to delete the cell at the index specified by cell_number.

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "notebook_path": {
      "type": "string",
      "description": "The absolute path to the Jupyter notebook file to edit (must be absolute, not relative)"
    },
    "cell_number": {
      "type": "number",
      "description": "The index of the cell to edit (0-based)"
    },
    "new_source": {
      "type": "string",
      "description": "The new source for the cell"
    },
    "cell_type": {
      "type": "string",
      "enum": [
        "code",
        "markdown"
      ],
      "description": "The type of the cell (code or markdown). If not specified, it defaults to the current cell type. If using edit_mode=insert, this is required."
    },
    "edit_mode": {
      "type": "string",
      "enum": [
        "replace",
        "insert",
        "delete"
      ],
      "description": "The type of edit to make (replace, insert, delete). Defaults to replace."
    }
  },
  "required": [
    "notebook_path",
    "cell_number",
    "new_source"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
