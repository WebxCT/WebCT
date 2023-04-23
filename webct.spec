# -*- mode: python ; coding: utf-8 -*-


block_cipher = None


a = Analysis(
	['app.py'],
	pathex=[],
	binaries=[],
	datas=[('webct/blueprints/', 'webct/blueprints')],
	hiddenimports=['cil.plugins.tigre', 'tigre'],
	hookspath=['.\\webct\\__pyinstaller\\hooks\\'],
	hooksconfig={},
	runtime_hooks=[],
	excludes=[],
	win_no_prefer_redirects=False,
	win_private_assemblies=False,
	cipher=block_cipher,
	noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
splash = Splash(
	'.\\doc\\webct-blurb.png',
	binaries=a.binaries,
	datas=a.datas,
	text_pos=(30, 250),
	text_size=12,
	text_color="white",
	minify_script=True,
	always_on_top=True,
)

exe = EXE(
	pyz,
	a.scripts,
	a.binaries,
	a.zipfiles,
	a.datas,
	splash,
	splash.binaries,
	[],
	name='WebCT',
	debug=False,
	bootloader_ignore_signals=False,
	strip=False,
	upx=False,
	upx_exclude=[],
	runtime_tmpdir=None,
	console=True,
	disable_windowed_traceback=False,
	argv_emulation=False,
	target_arch=None,
	codesign_identity=None,
	entitlements_file=None,
	icon=['webct\\blueprints\\app\\static\\img\\favicons\\favicon.ico'],
	version='file_version_info.cfg'
)
