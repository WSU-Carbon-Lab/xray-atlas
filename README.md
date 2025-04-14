# X-Ray Atlas

<p align="center">
  <img src="https://github.com/WSU-Carbon-Lab/xray-atlas/raw/main/public/wsu-logo.png" height="200" alt="X-Ray Atlas Logo">
</p>

<p align="center">
  A platform for sharing and analyzing X-ray absorption spectroscopy data.
</p>

<div align="center">
  <a href="https://xray-atlas.wsu.edu">Home</a> | <a href="https://github.com/WSU-Carbon-Lab/xray-atlas/wiki">Docs</a> | <a href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues">Issues</a>
</div>

## About X-Ray Atlas

X-Ray Atlas is an open platform for sharing, exploring, and analyzing NEXAFS/XANES spectroscopy data. It serves as a central repository for researchers to upload, search, and compare experimental data from various synchrotron facilities worldwide.

## Uploading Data

X-Ray Atlas simplifies the process of contributing spectroscopy data:

1. Fill out the data upload form with:
   - Molecule information (name, formula, structure)
   - Sample details (vendor, preparation method)
   - Experimental parameters (facility, beamline, edge, technique)
   - Researcher information

2. Upload your CSV data file containing:
   - Energy values (eV)
   - Intensity values (µ)
   - Angle information (theta, phi)

3. Submit the form to generate the necessary JSON files

4. Create a GitHub issue to complete the submission process

The platform handles data validation, normalization, and integration with the existing database.

## Repository Structure

- `src/app/_components`: React components for the web interface
- `src/server`: Server-side code for data processing and API endpoints

## Contributing

We welcome contributions from the research community:

1. **Data Contributions**: Use the data upload form or submit a pull request with your spectroscopy data
2. **Code Contributions**: Help improve the platform's functionality, visualization tools, or user interface
3. **Documentation**: Enhance our guides, API documentation, or tutorials

Please check our [contributing guidelines](https://github.com/WSU-Carbon-Lab/xray-atlas/blob/main/CONTRIBUTING.md) for more details.

## Data Format

The database uses a structured JSON format that includes:

- Molecule metadata (name, formula, structure)
- Experiment details (facility, technique, edge)
- Spectroscopy data (energy, intensity, angle information)

Data is stored in individual molecule files and referenced in a central registry for efficient querying.

# REST API
There is an underying REST api that serves database content to the outside world uppon request. This is handeled by AWS and does 
accumulate a small charge based on the number of calls you make. If you are going to frequently use the same dataset for a calculation
we recommend downloading it through the website and working with the local copy. 

## Outline of the API


## License

This project is licensed under the [MIT License](https://github.com/WSU-Carbon-Lab/xray-atlas/blob/main/LICENSE).

## Contact

For questions or support, please [open an issue](https://github.com/WSU-Carbon-Lab/xray-atlas/issues) or contact the WSU Carbon Lab team.
