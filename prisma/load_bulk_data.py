# File to quickly load data into the database

from pathlib import Path

# Load all the data from the data files
data_path = Path(
    "C:\\Users\\hduva\\Washington State University (email.wsu.edu)\\Carbon Lab Research Group - Documents\\Obaid Alqahtani\\Research Projects\\Other Research Projects\\Angle-resolved NEXAFS Database Project_2021\\1st Set_2022"
).absolute()

molecules = [
    x.stem for x in data_path.iterdir() if x.is_dir() and x.name != "Energy Calibration"
]

for molecule in molecules:
    for edge in (data_path / molecule).iterdir():
        if edge.is_dir():
            _edge = edge.stem[0].upper() + "-K"
            for file in edge.iterdir():
                if file.suffix == ".txt":
                    anlge = file.stem.split("deg")[0][-2:]
                    print(
                        f"Loading data for {molecule} at the {_edge} at {anlge} degrees"
                    )
            break
