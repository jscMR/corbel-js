// var mocha = require("mocha");
// var sinon = require("sinon");
// var chai = require("chai");
(function() {
    describe('Silkroad SDK', function() {

        it('exports global variable', function() {
            expect(!!window.silkroad).to.be.equal(true);
        });

        it('should has module request', function() {
            expect(window.silkroad).to.have.ownProperty('request');
        });

        it('function get exist and return object', function() {
            var stub = sinon.stub(window.silkroad.request, 'getXhr');

            var miVar = window.silkroad.request.get({
                port: '3000',
                hostname: 'localhost',
                path: '/res/res.json'
            }, function(res) {
                console.log(res);
            });

            expect(typeof mivar).to.be.equal('object');
        });

    });
    describe('Array', function() {
        describe('pepe', function() {
            it('should return -1 when the value is not present', function() {
                expect(-1).to.be.equal([1, 2, 3].indexOf(0));
            });
        });
    });

    // console.log('variable ', window._$jscoverage);
})();