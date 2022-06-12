# Contributing

## Common Errors

### Error: While importing 'app', an ImportError was raised.

If dependencies are not added correctly, an unhelpful import error will be raised by flask when trying to start.

To get a better error message, use the `python` command in the root directory, and in the interactive terminal, use:
```py
from app import create_app
```

The following output will be more verbose, helping narrow down what dependencies are misssing.
