var express = require('express');
var router = express.Router();
const axios = require('axios');

const profileUrl = 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me';
const projectsUrl = 'https://dev.azure.com/nkelly75/_apis/projects';
const treeUrl = 'https://dev.azure.com/nkelly75/a533eea4-4b70-48c9-8642-faec464149c3/_apis/git/repositories/f497f4f9-b44e-4305-a9f9-9f0e32a2104d/trees/9804b758e84cac41a6acc4d011f57310a1f63102';

router.get('/', function (req, res, next) {
    let result = {
        title: 'DevOps API Calls'
    };

    if (req.session.accessToken) {
        console.log('Found accessToken in session');
        let headers = getBearerHeader(req.session.accessToken);

        axios.all([
            axios.get(profileUrl, { headers: headers }),
            axios.get(projectsUrl, { headers: headers }),
            axios.get(treeUrl, { headers: headers })
        ])
            .then(axios.spread((profile, projects, tree ) => {
                result.profile = {};
                if (profile.data.displayName) {
                    result.profile.displayName = profile.data.displayName;
                    req.session.displayName = profile.data.displayName;
                }
                if (profile.data.emailAddress) {
                    result.profile.emailAddress = profile.data.emailAddress;
                }

                result.projects = [];
                projects.data.value.forEach(function (project) {
                    let p = {};
                    if (project.name) {
                        p.name = project.name;
                    }
                    if (project.lastUpdateTime) {
                        p.lastUpdate = project.lastUpdateTime;
                    }
                    result.projects.push(p);
                });

                result.tree = {};
                if (tree.data) {
                    result.tree.url = treeUrl;
                    result.tree.json = JSON.stringify(tree.data, null, 2);
                }

                res.render('devops', result);
            }), (error) => {
                console.error('Error from DevOps APIs');
                result.error = 'Error from DevOps APIs';
                res.render('devops', result);
            });
    } else {
        result.error = 'Need a token before making API calls';
        res.render('devops', result);
    }
});

function getBearerHeader(token) {
    return {
        'authorization': 'Bearer ' + token
    }
}

module.exports = router;
