exports.eat = function(bites, size) {
  var banana = new Banana(size);
  var quantity =  banana.length - bites;
  return 'You have ' + quantity + '/' banana.length + ' of a banana left';
};

exports.getColor = function() {
  return 'yellow';
};
