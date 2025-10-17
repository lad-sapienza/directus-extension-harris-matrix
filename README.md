# directus-extension-harris-matrix

`directus-extension-harris-matrix` is a [Directus](https://directus.io/) [layout extension](https://docs.directus.io/extensions/layouts.html) that brings graph visualisation of stratigraphy data to your archaeological database.

The [Harris matrix](https://en.wikipedia.org/wiki/Harris_matrix) is a tool used to depict the temporal succession of archaeological contexts and thus the sequence of depositions and surfaces on a 'dry land' archaeological site, otherwise called a 'stratigraphic sequence'. The matrix reflects the relative position and stratigraphic contacts of observable stratigraphic units, or contexts. It was developed in 1973 in Winchester, England, by Edward C. Harris. 

## How to install
1. Create, if not yet available, a directory named `extensions` in the root directory of your running Directus instance.
1. Create the directory `directus-extension-harris-matrix` inside the `extensions` directory
1. Copy inside `extensions/directus-extension-harris-matrix/` the file `package.json` and the directory `dist` from this repository
1. Restart Directus and you are done!

## How to model your database to record and display stratigraphy data

### Database Schema Requirements

The Harris Matrix extension requires two collections in your Directus database:

#### 1. Contexts Collection (e.g., `contexts`)

This is the main collection containing your archaeological contexts. Required fields:

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| `id` | Integer | Primary key (auto-increment) | Yes |
| `context_id` | String (varchar) | Unique context identifier (e.g., "149", "US001") | Yes |
| `context_type` | String | Type of context (e.g., "layer", "cut", "structure") | Recommended |
| `description` | Text | Context description | Optional |
| `stratigraphy` | O2M Relation | One-to-Many relationship to stratigraphic_relationships | Yes |

**Note**: The `context_id` field should be unique and is used to identify contexts in the graph. The `id` field is the database primary key.

#### 2. Stratigraphic Relationships Collection (e.g., `stratigraphic_relationships`)

Junction collection storing stratigraphic relationships between contexts:

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| `id` | Integer | Primary key (auto-increment) | Yes |
| `this_context` | String | Foreign key to contexts.context_id (source context) | Yes |
| `other_context` | M2O Relation | Many-to-One relation to contexts collection (target context) | Yes |
| `relationship` | String | Relationship type (see below) | Yes |

**Supported relationship types**:
- Stratigraphic above: `fills`, `covers`, `cuts`, `leans against`
- Stratigraphic below: `is filled by`, `is covered by`, `is cut by`, `carries`
- Contemporary: `is the same as`, `is bound to`

#### 3. Directus Relationship Configuration

In Directus Data Model settings:

1. **Create the `stratigraphic_relationships` collection** with the fields above
2. **In the `contexts` collection**, add a field named `stratigraphy`:
   - Field Type: **One to Many (O2M)**
   - Related Collection: `stratigraphic_relationships`
   - Foreign Key Field: `this_context`
3. **In the `stratigraphic_relationships` collection**, configure `other_context`:
   - Field Type: **Many to One (M2O)**
   - Related Collection: `contexts`
   - Display Template: `{{context_id}}` (to show the context identifier)

### Example SQL Schema (PostgreSQL)

```sql
-- Contexts table
CREATE TABLE contexts (
    id SERIAL PRIMARY KEY,
    context_id VARCHAR(255) UNIQUE NOT NULL,
    context_type VARCHAR(255),
    description TEXT,
    -- ... other fields as needed
);

-- Stratigraphic relationships table
CREATE TABLE stratigraphic_relationships (
    id SERIAL PRIMARY KEY,
    this_context VARCHAR(255) NOT NULL REFERENCES contexts(context_id),
    other_context INTEGER NOT NULL REFERENCES contexts(id),
    relationship VARCHAR(255) NOT NULL
);
```

### Video Tutorial

[Here](https://youtu.be/yEDQMQqO87I) you can find a very extensive tutorial on how to configure your directus collections to be rendered by the HMDE. Currently only in italian. We hope we'll be back with an english version ASAP

## Graph Engines

The extension provides two visualization engines:

### Standard Engine
- Shows all stratigraphic relationships without simplification
- Groups contemporary contexts (same as/bound to) into subgraphs with dashed blue lines
- Best for: Small to medium stratigraphic sequences where seeing all relationships is important

### Carafa Engine (recommended)
- Applies transitive reduction using Graphviz's built-in algorithm to remove redundant edges
- Automatically clusters related contemporary contexts into single nodes
- Exports JSON Graph Format (JGF) data
- Best for: Large, complex archaeological sites with many relationships

The Carafa engine simplifies complex graphs by removing redundant edges (transitive reduction) and merging contemporary contexts into clusters, making large stratigraphic sequences easier to understand and visualize.

## Credits

The repository is maintained by [LAD](https://lad.saras.uniroma1.it) and developed by [Domenico Santoro](https://github.com/domesantoro) and [Julian Bogdani](https://github.com/jbogdani).


## License

This plugins is released with the GNU Affero General Public License (AGPL) v.3.0 License. Full text is available at [https://www.gnu.org/licenses/agpl-3.0.en.html](https://www.gnu.org/licenses/agpl-3.0.en.html).

Did you found a bug? Do you need any improvement? Please [file an issue](https://github.com/lab-archeologia-digitale/directus-extension-harris-matrix/issues/new).
