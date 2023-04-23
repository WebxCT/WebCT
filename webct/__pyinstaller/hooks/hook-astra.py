"""PyInstaller hook for astra's non-python dependencies."""

from PyInstaller.utils.hooks import collect_data_files

# include compiled astra_c files
datas = collect_data_files("astra", include_py_files=True)
