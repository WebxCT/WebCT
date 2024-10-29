import subprocess
from datetime import datetime
from time import monotonic
"""version.py : Update and write version information to files"""

version = "0.1.3"

def file_version_info_cfg(release:bool, version:str, commit:str) -> None:
	# developer version; use a commit reference instead of file version
	ver = version if release else commit

	# For more details about fixed file info 'ffi' see:
	# http://msdn.microsoft.com/en-us/library/ms646997.aspx
	with open("file_version_info.cfg", "w", encoding="utf-8") as f:
			f.write(f'''# Generated {datetime.now()} by version.py
VSVersionInfo(
	ffi=FixedFileInfo(
		# filevers and prodvers should be always a tuple with four items: (1, 2, 3, 4)
		# Set not needed items to zero 0.
		filevers=(0, {', '.join(version.split('.'))}),
		prodvers=(0, {', '.join(version.split('.'))}),
		# Contains a bitmask that specifies the valid bits 'flags'r
		mask=0x3f,
		# Contains a bitmask that specifies the Boolean attributes of the file.
		flags=0x2,
		# The operating system for which this file was designed.
		# 0x4 - NT and there is no need to change it.
		OS=0x4,
		# The general type of file.
		# 0x1 - the file is an application.
		fileType=0x1,
		# The function of the file.
		# 0x0 - the function is not defined for this fileType
		subtype=0x0,
		# Creation date and time stamp.
		date=(0, 0)
	),
	kids=[
		StringFileInfo([
			StringTable('000004b0',[
				StringStruct('Comments', '{'Development build of the ' if not release else ''}WebCT Server for X-ray Computed Tomography.'),
				StringStruct('LegalCopyright', '© Iwan Mitchell {int(datetime.now().year)}'),
				StringStruct('CompanyName', 'Iwan Mitchell'),
				StringStruct('FileDescription', 'WebCT Server for X-ray Computed Tomography.'),
				StringStruct('FileVersion', '{ver}'),
				StringStruct('ProductVersion', '{ver}'),
				StringStruct('InternalName', 'webct'),
				# StringStruct('LegalTrademarks', ''),
				StringStruct('OriginalFilename', 'WebCT.exe'),
				StringStruct('ProductName', 'WebCT Server'),
				StringStruct('BuildID', '')
			])
		]),
		VarFileInfo([VarStruct('Translation', [0, 1200])])
	]
)
''')

def version_py(release:bool, version:str, commit:str) -> None:
	ver = version if release else commit

	with open("webct/version.py", "w") as f:
			f.write(f'''# Generated {datetime.now()} by version.py\nversion="{ver}"\ndebug={not release}\nbase="{version}"''')


def version_j2_html(release:bool, version:str, commit:str) -> None:
	ver = version if release else commit

	with open("webct/blueprints/base/templates/version.html.j2", "w") as f:
			f.write(f"{ver}")


if __name__ == "__main__":
	tik = monotonic()
	try:
		commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode().strip()
		tag = subprocess.check_output(['git', 'tag', '--points-at', 'HEAD']).decode().strip()
	except:
		print("Failed to get git status. Is this a git repository?")
		raise RuntimeError("Error generating version information; tag version and current version do not match!!")

	# tags starting with v indicate a version release.
	release = len(tag) > 1 and tag[0] == "v"
	if release and version != tag[1:]:
		raise RuntimeError(f"Error generating version information; tag version and current version do not match!! Git: '{tag[1:]}' Version: '{version}'")

	if release:
		print(f"Generating version information for release build {version} (commit {commit})")
	else:
		print(f"Generating version information for debug build {commit} (based on v{version})")

	print("Creating file_version_info.cfg for pyinstaller...")
	file_version_info_cfg(release, version, commit)

	print("Creating version.py for webct backend...")
	version_py(release, version, commit)
	print("Creating version.j2.html for webct frontend...")
	version_j2_html(release, version, commit)
	print(f"Done! (in {monotonic()-tik:.2f}s)")
