"""PyInstaller hook for astra's non-python dependencies."""

from PyInstaller.utils.hooks import collect_data_files
from astra import __file__ as astra_dir
from pathlib import Path

astra_path = Path(astra_dir).parent

# include compiled astra_c files
datas = collect_data_files("astra", include_py_files=True)

# Utils and experimental are only called within precompiled code, and are therefore not discovered by pyinstaller's tracing.
experimental_pyd = [x for x in astra_path.glob("experimental.*.pyd")][0]
utils_pyd = [x for x in astra_path.glob("utils.*.pyd")][0]

datas.append(((experimental_pyd), "./astra/"))
datas.append(((utils_pyd), "./astra/"))
