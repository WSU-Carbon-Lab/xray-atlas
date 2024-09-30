# Nexafs Database

This repository is used to version controll a database for NEXAFS data collected at the
various synchrotron facilities. Currently, the database is stored in flat json files,
but the plan is to move to a more robust serverless database in the future.

## Loading new Data
Trying and failing to implement the single responsibility principle, the `local_nexafs_parse.ipynb`
notebook has been used to load new data into the database. The notebook is a bit of a mess, and
feel free to clean it up. Escentially, the notebook reads an excel file, and loads the
data into a json file. There are two important json files in the database:
- `regestry.json`: This file contains the metadata for each sample. The metadata includes
    the molecule name, molecular formula, image path, vendor, cid, and sid.
- `{name}.json`: This file contains a copy of the data from the meta data with information
    about the experiment such as edge, synchrotron, endstation, experimentalist, and
    the actual data. The experimental data is stored in a list of dictionaries, where the
    dictionaries contain a data key describing a dictionary of the data. The data dictionary
    has keys for the incident angle, and contains lists for energy and intensity.

The data was setup this way to make it easier to load into the website. Because of this,
the `{name}.json` files repeat the metadata from the `regestry.json` file. So any updates
need to be made in both files.
