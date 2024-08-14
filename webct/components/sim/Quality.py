from enum import IntEnum


class Quality(IntEnum):
	# High quality is a pixel-perfect simulation, including full detector size,
	# and a reconstruction space matching the projection size.
	HIGH = 0

	# Medium quality uses a full detector size for projections, but a reduced
	# size for the reconstruction space.
	MEDIUM = 1

	# Low quality uses a half detector size for projections, and an even more
	# reduced reconstruction space compared to medium.
	LOW = 2

	# Preview uses a fixed detector size of no more than 100 pixels in all axis,
	# and will keep aspect ratio if one axis exceeds this limit. The
	# reconstruction space is a fixed 100x100x100 cube.
	PREVIEW = 3
