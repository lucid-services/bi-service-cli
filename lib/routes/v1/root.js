
module.exports = function(app) {
    var router = app.buildRouter({
        version: 1.0,
        url: '/'
    });

    router.buildRoute({ type: 'get', url : '/', summary: '' })
    .respondsWith({ $is: String })
    .main(function (req, res) {
        res.send('up');
        res.end();
    });
};
