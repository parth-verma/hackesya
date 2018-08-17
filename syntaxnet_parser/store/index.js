const Promise = require('bluebird');
const flatten = require('lodash.flatten');
const neo4j = require('node-neo4j');
const rp = require('request-promise');
const keyBy = require('lodash.keyby');
const redis = require('redis');

const rClient = redis.createClient('redis://ry9910725@gmail.com:Rahul669@r-dj1bc5ba5cdf87d4.redis.rds.aliyuncs.com:6379');
// console.log(rClient);
const db = new neo4j('http://neo4j:1234@localhost:7474');

db.cypherQueryAsync = Promise.promisify(db.cypherQuery, db);

const sample = require('./parsed.json');

const POS = {
	'ADJ': true,
	'ADP': true,
	'ADV': true,
	'AUX': true,
	'CONJ': true,
	'DET': true,
	'INTJ': true,
	'NOUN': true,
	'NUM': true,
	'PART': true,
	'PRON': true,
	'PROPN': true,
	'PUNCT': true,
	'SCONJ': true,
	'SYM': true,
	'VERB': true,
	'X': true,
};

function bootstrap() {
  return Promise.all(
    Object.keys(POS).map(pos => new Promise((resolve, reject) => {
			console.log(pos);
      db.cypherQuery(`CREATE INDEX ON :${pos}(word)`, (err, res) => {
        if (err) {
					console.log(err);
					return reject(err);}
        resolve();
      });
    }))
  );
}

function createNode(node) {
	return new Promise((resolve, reject) => {
		// console.log(`MERGE (n:${node.cpostag} {word: "${node.form}"})`);
    db.cypherQuery(
      `MERGE (n:${node.cpostag} {word: "${node.form}"}) RETURN n;`
    , (err, res) => {
      if (err) return reject(err);
      const dbNode = res.data[0];
			// console.log('success');
      return resolve(

        Object.assign({}, dbNode, node)
      );
    });
  });
}

function createRelations(node, dbNodes) {
  const nId = dbNodes[node.id]._id;
  const mId = dbNodes[node.head]._id;
	console.log(dbNodes[node.head]);

  db.cypherQuery(`
    MATCH (n), (m) WHERE n=ID(${nId}) AND m=ID(${mId})
    CREATE n -[:${node.cpostag}]->m
  `,(err,res)=>{console.log(err);});

  if (node.cpostag === 'VERB') {
    db.cypherQuery(`
      MATCH (n), (m) WHERE n=ID(${nId}) AND m=ID(${mId})
      CREATE (n) -[:${node.word.toUpperCase()}]->(m)
    `);
  }
}

module.exports = {
  sample,

  indexSyntaxnetGraph: Promise.coroutine(function*(nodes) {

		nodes = nodes.filter(n => n.cpostag in POS);

    // create all the nodes, indexed by POS
    const dbNodes = keyBy(yield Promise.all(nodes.map(createNode)), 'id');

    // create all the edges for all verbs
		// console.log(dbNodes);
    yield Promise.all(nodes.map(node => createRelations(node, dbNodes)));

    // prune the node
    yield db.removeNodeByLabel('ADP');
    yield db.removeNodeByLabel('DET');
    yield db.removeNodeByLabel('DET');
  }),
};
