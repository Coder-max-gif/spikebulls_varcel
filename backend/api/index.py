import sys
from pathlib import Path

# Add parent directory to path so imports work
root_path = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(root_path))

from server import app

# Expose the FastAPI app for Vercel
__all__ = ["app"]
