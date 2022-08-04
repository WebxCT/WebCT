# Reconstruction Combinations

A large amount of interchangeable components are available to iterative
reconstruction methods, however; not all work together.

Below is a table of all methods, and what components they work with.



| Method | Identity | Gradient |     | TotalVariation (TV) | IndicatorBox | FGP-TV | TGV |     | LeastSquares |
| ------ | -------- | -------- | --- | ------------------- | ------------ | ------ | --- | --- | ------------ |
| FBP    |          |          |     |                     |              |        |     |     |              |
| FDK    |          |          |     |                     |              |        |     |     |              |
| CGLS   | ✔        | ✔        |     |                     |              |        |     |     |              |
| SIRT   | ✔        |          |     | ✔?                  | ✔            | ✔?     | ✔?  |     |              |
| FISTA  |          |          |     | ✔                   | ✔            | ✔      | ✔   |     | ✔            |
