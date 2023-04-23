"""PyInstaller hook for spekpy's non-python dependencies, mostly data files."""

from PyInstaller.utils.hooks import collect_data_files

from pathlib import Path
import spekpy

datas = collect_data_files("spekpy", subdir="data")
