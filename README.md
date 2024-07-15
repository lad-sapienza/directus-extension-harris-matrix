# directus-extension-harris-matrix

`directus-extension-harris-matrix` is a [Directus](https://directus.io/) [layout extension](https://docs.directus.io/extensions/layouts.html) that brings graph visualisation of stratigraphy data to your archaeological database.

The [Harris matrix](https://en.wikipedia.org/wiki/Harris_matrix) is a tool used to depict the temporal succession of archaeological contexts and thus the sequence of depositions and surfaces on a 'dry land' archaeological site, otherwise called a 'stratigraphic sequence'. The matrix reflects the relative position and stratigraphic contacts of observable stratigraphic units, or contexts. It was developed in 1973 in Winchester, England, by Edward C. Harris. 

## How to install
1. Create, if not yet available, a directory named `extensions` in the root directory of your running Directus instance.
1. Create the directory `directus-extension-harris-matrix` inside the `extensions` directory
1. Copy inside `extensions/directus-extension-harris-matrix/` the file `package.json` and the directory `dist` from this repository
1. Restart Directus and you are done!

## How to model your database to record and display stratigraphy data

[Here](https://caffeineandpizza.info/HMDE) you can find a very extensive tutorial on how to configure your directus collections to be rendered by the HMDE. Currently only in italian. We hope we'll be back with an english version ASAP

## Credits

The repository is maintained by [LAD](https://lad.saras.uniroma1.it) and developed by [Domenico Santoro](https://github.com/domesantoro) and [Julian Bogdani](https://github.com/jbogdani).


## License

This plugins is released with the GNU Affero General Public License (AGPL) v.3.0 License. Full text is available at [https://www.gnu.org/licenses/agpl-3.0.en.html](https://www.gnu.org/licenses/agpl-3.0.en.html).

Did you found a bug? Do you need any improvement? Please [file an issue](https://github.com/lab-archeologia-digitale/directus-extension-harris-matrix/issues/new).
