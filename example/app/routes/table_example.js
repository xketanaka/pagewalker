
module.exports = {
  GET: {
    "/table_example": (req, res)=>{
      let fruits = ["Apple", "Orange", "Banana", "Pear", "Peach", "Lemon", "Cherry"];
      let fruitsValue = [0, 0, 0, 0, 0, 0, 0, 0]
      res.renderLayout("/table_example/index", { fruits: fruits, fruitsValue: fruitsValue });
    },
  },
  POST: {
    "/table_example/apply": (req, res)=>{
      let fruits = ["Apple", "Orange", "Banana", "Pear", "Peach", "Lemon", "Cherry"];
      let fruitsValue = [0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < fruits.length; i++) {
        fruitsValue[i] = parseInt(req.body['currentValue-' + i]);
        fruitsValue[i] = fruitsValue[i] + parseInt(req.body['addValue-' + i]);
      }
      res.renderLayout("/table_example/index", { fruits: fruits, fruitsValue: fruitsValue });
    },
  }
}
