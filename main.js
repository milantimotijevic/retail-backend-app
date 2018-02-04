const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.listen(port, function() {
  console.log("Application running on port " + port);
});

const db = mysql.createConnection({
  host: 'localhost',
  socketPath: '/var/run/mysqld/mysqld.sock',
  user: 'milan',
  password: 'linuxsux',
  database: 'nodemysql'
});

db.connect(function(err) {
  if(err) throw err;
  console.log("Connection with DB established...");
});

app.get('/products', function(req, resp) {
  fetchProducts(function(data) {
    resp.json(data);
  });
});

app.post('/buy', function(req, resp) {
  decrementStocks(req.body, function(result) {
    resp.json(result);
  });
});

function fetchProducts(cb) {
  const sql = 'SELECT * FROM products';
  db.query(sql, function(err, result) {
    if(err) throw err;
    cb(result);
  });
}

function decrementStocks(products, cb) {
  var failed = [];
  for(var i = 0; i < products.length; i++) {
    var sql = `UPDATE products SET stock = stock - ${products[i].quantity} WHERE id = ${products[i].id} AND stock >= ${products[i].quantity}`;
    ((index, product) => { //self-calling function to allow current index/product capturing for DB query cb
      db.query(sql, function(err, result) {
        if(err) {
          cb({purchaseRequestStatus: "ERROR", reason: "DB_ERROR", data: err});
        }else if(result.affectedRows === 0) {
          failed.push({id: product.id, name: product.name});
        }
        var payload = {purchaseRequestStatus: "SUCCESS"};
        if(index === products.length - 1) {
          if(failed.length > 0) {
            payload.purchaseRequestStatus = "FAILURE";
            payload.reason = "ITEM_OUT_OF_STOCK";
            payload.data = failed;
          }
          cb(payload);
        }
      });
    })(i, products[i]); //this is where I pass the index/product
  }
}