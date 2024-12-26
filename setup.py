from setuptools import setup, Extension
from Cython.Build import cythonize
import os

# Add scripts directory to Python path
scripts_dir = os.path.join(os.path.dirname(__file__), 'scripts')
if scripts_dir not in os.sys.path:
    os.sys.path.append(scripts_dir)

extensions = [
    Extension(
        "expr_tree",
        ["scripts/expr_tree.pyx"],
        include_dirs=[scripts_dir],
    ),
    Extension(
        "generate_levels",
        ["scripts/generate_levels.pyx"],
        include_dirs=[scripts_dir],
    ),
]

setup(
    name="four-nines-game",
    ext_modules=cythonize(extensions, compiler_directives={'language_level': "3"}),
    package_dir={'': 'scripts'},
    py_modules=['expr_enums'],
) 