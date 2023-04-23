from PyInstaller.utils.hooks import collect_data_files, collect_all

from pathlib import Path

datas, binaries, hiddenimports = collect_all("tigre")
