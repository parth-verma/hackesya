
# Story Graph
this is a speech to image api with an optional web app. It's main use case is for bed time
story telling: imagine telling a story to someone and having an app render
a number of images for each phrase you speak.

## Technical details

We use Watson Speech API for speech to text transformation. After that
we feed each phrase into Google's *Syntax Net* to anotate it with POS. Then we
apply a model to summarize the phrase to a number of search terms that we
use to search images for using image search.
