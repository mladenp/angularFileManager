var myApp = angular.module('myApp', [
    'ui.router',
    'ui.bootstrap',
    'ui.select',
    'xeditable'
])

    .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

        $stateProvider.state('app', {
            url: '/',
            views: {
                "main": {
                    controller: 'AppCtrl',
                    templateUrl: 'app.tpl.html'
                }
            }
        });

        $urlRouterProvider.otherwise('/');
    }])

    .run(function(editableOptions){
        editableOptions.theme = 'bs3';
    })

    .filter('orderNodes', function() {
        return function(nodes) {

            // Split into dirs and files array, sort them alphabetically and concat them
            var dirs = [];
            var files = [];

            angular.forEach(nodes, function(item){
                if(item.type == 'dir'){
                    dirs.push(item);
                }
                else{
                    files.push(item);
                }
            });

            function sortAbc(a, b){

                if(a.name.toLowerCase() > b.name.toLowerCase()){
                    return 1;
                }
                if(a.name.toLowerCase() < b.name.toLowerCase()){
                    return -1;
                }
                return 0;
            }

            // Sort both arrays alphabetically
            dirs.sort(sortAbc);
            files.sort(sortAbc);

            console.log(dirs.concat(files));

            return dirs.concat(files);
        }
    })

    .directive('fmIcon', function($compile){

        function getTemplate(type){
            switch (type){
                case 'dir': return '<i class="glyphicon glyphicon-folder-open"></i>';
                case 'file': return '<i class="glyphicon glyphicon-file"></i>';
                case 'file.html': return '<i class="glyphicon glyphicon-file html"></i>';
                case 'file.php': return '<i class="glyphicon glyphicon-file php"></i>';
                case 'file.js': return '<i class="glyphicon glyphicon-file js"></i>';
                default:  return '<i class="glyphicon glyphicon-warning-sign"></i>';
            }
        }

        return {
            restrict: 'E',
            scope: true,
            replace: true,
            controller: function(){

            },
            link: {
                post: function(scope, element, attr){
                    var newIconElement = $compile(getTemplate(attr.type))(scope);
                    element.replaceWith(newIconElement);
                }
            }

        };

    })

    .directive('repeater', function(){
        return {
            restrict: 'E',
            scope: {'nodes': '='},
            templateUrl:'views/nodeRepeat.html',
            controller: function($scope, $rootScope, $filter) {

                $scope.checkName = function(oldName, newName){
                    if(oldName != newName){
                        $rootScope.alerts.push({ type: "info", time: 3000, msg: "Renamed " + oldName + " to " + newName });
                    }
                };

                $scope.order = function(parentNode){
                    parentNode.nodes = $filter('orderNodes')(parentNode.nodes);
                };

                $scope.delete = function(nodes, node) {
                    var nodeIndex = nodes.indexOf(node);
                    nodes.splice(nodeIndex, 1);
                    $rootScope.alerts.push({ type: "danger", time: 3000, msg: "Deleted " + node.type + ": " + node.name });

                };

                $scope.nodeDetails = function(node){
                    $rootScope.nodeDetail = node;
                };

            }
        }
    })

    .controller('AppCtrl', function($scope, $rootScope, $uibModal, $filter){

        // Keyboard shortcuts and alerts
        Mousetrap.bind('n d', function() { $scope.openModal('dir'); });
        Mousetrap.bind('n f', function() { $scope.openModal('file'); });

        $rootScope.alerts = [];
        $rootScope.alerts.push({ type: "info", time: 6000, msg: "You can use keyboard shortcuts like N D for new Dir or N F for new File" });

        $scope.collapsed = false;

        // Initial root node
        $rootScope.nodes = { id: '0', name: 'root', parent: null, type: 'dir', children:[]};

        // Initial root node for array
        $rootScope.nodesFlat = [];
        $rootScope.nodesFlat.push({ id: '0', name: 'root' });

        // Update array for search box
        $scope.$watch('nodes', function(val){
            console.log(val);
            buildFlatArray($rootScope.nodes.children);
            console.log($rootScope.nodesFlat);
        }, true);

        $scope.openModal = function (type) {

            // Choose template based on type
            if(type === 'dir'){
                url = '/views/dirPicker-modal.html';
            }else{
                url = '/views/filePicker-modal.html';
            }

            // Open modal
            $rootScope.modalInstance = $uibModal.open({
                templateUrl: url,
                size: 'md',
                scope: $scope
            });

        };

        /**
         * Find Node with unique ID via Depth First Search
         * @param {object} root - tree to search
         * @param {number} id - unique ID of node
         * @returns {object} An resulting object Node that matches id
         */
        function findNodeById(root, id){
            if(root.id == id){
                return root;
            }else if (root.children != null){
                var i;
                var result = null;
                for(i=0; result == null && i < root.children.length; i++){
                    result = findNodeById(root.children[i], id);
                }
                return result;
            }
            return null;
        }

        /**
         * Generate unique hierarchical ID for node and check for collision.
         * @param {object} parentNode - parent node object
         * @return {string} generatedID - unique ID
         */
        function generateId(parentNode){

            // Generate hierarchical ID
            var childrenLength = parentNode.children.length + 1;
            var generatedId = String(parentNode.id) + "." + String(childrenLength);

            function findDuplicate(node){
                return node.id == generatedId;
            }

            var duplicates = parentNode.children.find(findDuplicate);

            var i = 1;
            while(duplicates){
                generatedId = String(parentNode.id) + "." + String(parseInt(childrenLength + i));
                duplicates = parentNode.children.find(findDuplicate);
                i++;
            }

            return generatedId;


            // Check if generated ID already exist in this node, increment ( deleted node collision )
            /*			for(var i = 0; i < parentNode.children.length; i++){
             if(parentNode.children[i].id === generatedId){
             generatedId = String(parentNode.id) + "." + String(parseInt(childrenLength + 1));
             if(generatedId === parentNode.children[i].id){

             }
             }
             }*/
        }

        /**
         * Create new node and push it to parent node.
         * @param {string} type - node type (e.g. dir, file)
         * @param {string} name - node name
         * @param {number} parentId - unique ID of parent for new node
         * @param {string=} extension - optional extension for files only
         */
        $scope.createNode = function(type, name, parentId, extension){

            // Get parent node object by ID
            var parentNode = findNodeById($rootScope.nodes, parentId);

            if(parentNode != null && name){

                // If its file generate custom type and name vars
                if(extension){
                    var newProps = filePrepare(name, type, extension);
                    type = newProps.type;
                    name = newProps.name;
                }

                var generatedId = generateId(parentNode);

                // Create new object and push it to parent node
                var nodeObj = {
                    id: generatedId,
                    name: name,
                    parent: parentId,
                    type: type,
                    created: new Date().getTime(),
                    children:[]
                };
                parentNode.children.push(nodeObj);

                // Filter only parent node to order children according to child just added
                parentNode.children = $filter('orderNodes')(parentNode.children);

                // Close modal and notify user
                $rootScope.modalInstance.close();
                $rootScope.alerts.push({ type: "success", time: 2500, msg: "Successfully added new " + type + ": " + name });
            }
            else{
                $rootScope.alerts.push({ type: "error", time: 10000, msg: "Please choose valid parent directory" });
                alert('Sorry, select valid directory');
            }

        };

        $scope.onParentSelected = function(formModal){
            console.log(formModal);
        };

        // Build flat array from all nodes
        function buildFlatArray(root){


            for(var i = 0; i < root.length; i++){

                // If this node doesn't exist push it to flat array
                function checkDups(oneN){
                    return oneN.id == root[i].id;
                }
                var exists = $rootScope.nodesFlat.find(checkDups);

                console.log(exists);

                if(!exists){
                    $rootScope.nodesFlat.push({ id: root[i].id, name: root[i].name });
                }

                if(root[i].children.length != null){
                    buildFlatArray(root[i].children);
                }

            }

        }

        // Return object with new file name and type
        function filePrepare(name, type, extension){
            var newProps = {};
            newProps.name = name + "." + extension;
            newProps.type = type + "." + extension;
            return newProps;
        }


    });
