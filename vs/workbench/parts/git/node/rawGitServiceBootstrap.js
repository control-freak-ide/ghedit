/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require","exports","vs/base/common/winjs.base","vs/base/common/objects","vs/base/common/uri","vs/workbench/parts/git/common/git","vs/workbench/parts/git/node/git.lib","vs/workbench/parts/git/node/rawGitService","path","os","vs/base/node/pfs"],function(e,t,r,n,o,s,i,a,c,p,u){"use strict";function S(t,S,v,h,f){if(!t)return r.TPromise.as(new a.RawGitService(null));var w=o["default"].parse(e.toUrl("vs/workbench/parts/git/node")).fsPath,b=o["default"].parse(e.toUrl("bootstrap")).fsPath+".js";S=c.normalize(S);var d=n.assign({},process.env,{GIT_ASKPASS:c.join(w,"askpass.sh"),VSCODE_GIT_ASKPASS_BOOTSTRAP:b,VSCODE_GIT_ASKPASS_NODE:h,VSCODE_GIT_ASKPASS_MODULE_ID:"vs/workbench/parts/git/node/askpass"}),m=new i.Git({gitPath:t,version:f,tmpPath:p.tmpdir(),defaultEncoding:v,env:d}),g=m.open(S);return g.getRoot().then(null,function(e){return e instanceof i.GitError&&e.gitErrorCode===s.GitErrorCodes.NotAGitRepository?S:r.TPromise.wrapError(e)}).then(function(e){return u.realpath(e)}).then(function(e){return m.open(e)}).then(function(e){return new a.RawGitService(e)})}t.createRawGitService=S});