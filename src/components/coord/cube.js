import { InertialSystem } from "../../framework/coord/inertial";
import { _ } from 'mmvis/src/index';
import { FaceNames } from '../../constants';
import { CubeUI } from '../cubeUI/index.js';
import { AxisAttribute } from '../../framework/coord/model/axisAttribute';
import { Vector3, AmbientLight, DirectionalLight, PointLight, Matrix4, Math as _Math } from "mmgl/src/index";


/**
 * 1.文字太长省略号实现
 * 
 */


class Cube extends InertialSystem {
    constructor(root) {
        super(root)
        // let ratio = root.width / root.height;
        // let _frustumSize = 800;

        this.availableGraph = {
            widthRatio: 0.8,
            heightRatio: 0.8
        }

        this.DefaultControls = {
            autoRotate: false,       //默认不自动旋转
            boxWidth: this.width,         //空间中X的最大值(最大宽度)  
            boxHeight: this.height,        //空间中Y的最大值(最大高度)  
            boxDepth: this.height,         //空间中Z的最大值(最大深度)

            distance: 1600,        //默认相机距离
            maxDistance: 3000,     //最大相机距离
            minDistance: 600,      //最小相机距离 
            minZoom: 0.2,           //正交投影缩小的最小值
            maxZoom: 1.5,           //正交投影放大的最大值


            enableDamping: true,
            enablePan: false,
            enableKeys: false,
            autoRotateSpeed: 1.0,


            alpha: 5,    //绕X轴旋转
            beta: 5,      //绕Y轴旋转
            gamma: 0      //绕Z轴旋转
        }
        //默认坐标系原点偏移
        //默认Y轴文字最大预留160,X轴文字最大100
        this.offset = new Vector3(Math.min(160, this.width * 0.2), Math.min(100, this.height * 0.2), 0);
        //this.offset.set(0,0,0);
        //构建的数据集
        this._attributes = [];


        root.init(this.DefaultControls);
        root.renderView.project('ortho');
        this.init();




    }
    //基类调用 初始化配置
    setDefaultOpts(opts) {

        let defaultCoord = {
            xAxis: {
                layoutType: "peak", //"peak",  
                label: {
                    textAlign: "center",       //水平方向对齐: left  right center 
                    offset: 5
                }
            },
            yAxis: {
                layoutType: "peak", //"peak",
                label: {
                    textAlign: "right",
                    offset: 5
                }
            },
            zAxis: {
                layoutType: "peak",
                label: {
                    textAlign: "center",
                    offset: 5
                }
            }
        };

        opts.coord = _.extend(true, defaultCoord, opts.coord);
        return opts;
    }
    init() {

        let opt = _.clone(this.coord);
        let size = this.getGraphAreaSize();
        this.xAxisAttribute = new AxisAttribute(opt.xAxis, this.getAxisDataFrame(opt.xAxis.field));
        this.xAxisAttribute.setDataSection();
        this.xAxisAttribute.setAxisLength(size.width);

        this._attributes.push(this.xAxisAttribute);

        this.yAxisAttribute = new AxisAttribute(opt.yAxis, this.getAxisDataFrame(opt.yAxis.field));
        this.yAxisAttribute.setDataSection();
        this.yAxisAttribute.setAxisLength(size.height);

        this._attributes.push(this.yAxisAttribute);

        this.zAxisAttribute = new AxisAttribute(opt.zAxis, this.getAxisDataFrame(opt.zAxis.field));
        this.zAxisAttribute.setDataSection();
        this.zAxisAttribute.setAxisLength(size.height);

        this._attributes.push(this.zAxisAttribute);


        this.addLights();

        this.updatePosition();

        this.group.position.copy(this.offset.clone().multiplyScalar(0.5));

        this.bindEvent();
    }
    bindEvent() {
        let controlOps = this._root.opt.coord.controls;
        let second = 0.5;
        let {
            alpha,    //绕X轴旋转
            beta,      //绕Y轴旋转
            gamma      //绕Z轴旋转
        } = controlOps;

        let duration = 1000 * second; // 持续的时间
        let rotationCube = this.rotationCube();

        this.on('toFront', (e) => {
            rotationCube(5, 5, 0, duration);
        });
        this.on('toRight', (e) => {

            rotationCube(5, 95, 0, duration);

        })
        this.on('toTop', (e) => {
            rotationCube(95, 0, 5, duration);
        })

        this.on('planeclick', (e) => {
            let dir = this.getDirection();
            for (let face in FaceNames) {
                if (FaceNames[face] !== dir) {
                    let cmp = this._root.getComponent({ name: "Heatmap_" + FaceNames[face] });
                    if (cmp) {
                        cmp.cancelSelect();
                    }
                }

            }



        })

    }
    rotationCube() {

        let controlOps = this._root.opt.coord.controls;
        let {
            alpha,    //绕X轴旋转
            beta,      //绕Y轴旋转
            gamma      //绕Z轴旋转
        } = controlOps;


        return (alphaEnd, betaEnd, gammaEnd, duration) => {
            this._coordUI.hideAxis();

            let alphaStart = alpha;
            let spanAlpha = alphaEnd - alphaStart;    //发生的变化

            let betaStart = beta;
            let spanBeta = betaEnd - betaStart;    //发生的变化

            let gammaStart = gamma;
            let spanGamma = gammaEnd - gammaStart;    //发生的变化



            let currDate = new Date().getTime();

            let fn = () => {
                let pass = new Date().getTime() - currDate;
                if (pass <= duration) {
                    this._root.app.forceRender();
                    alpha = alphaStart + spanAlpha * pass / duration;
                    beta = betaStart + spanBeta * pass / duration;
                    gamma = gammaStart + spanGamma * pass / duration;

                    this.group.rotation.x = _Math.degToRad(alpha);
                    this.group.rotation.y = _Math.degToRad(-beta);
                    this.group.rotation.z = _Math.degToRad(gamma);

                } else {
                    alpha = alphaEnd;
                    beta = betaEnd;
                    gamma = gammaEnd;

                    this.group.rotation.x = _Math.degToRad(alpha);
                    this.group.rotation.y = _Math.degToRad(-beta);
                    this.group.rotation.z = _Math.degToRad(gamma);

                    this._coordUI.showAxis();
                    this._root.app._framework.off('renderbefore', fn)
                }
            };

            this._root.app._framework.on('renderbefore', fn)

        }

    }
    addLights() {
        //加入灯光

        var ambientlight = new AmbientLight(0xffffff, 1); // soft white light

        this._root.rootStage.add(ambientlight);

        let center = this.center.clone();
        center = this._getWorldPos(center);
        //center.setY(0);

        let dirLights = [];
        let intensity = 0.8;
        let lightColor = 0xFFFFFF;
        let position = new Vector3(0.5, 0.5, 1);

        dirLights[0] = new DirectionalLight(lightColor, intensity);
        position.multiplyScalar(10000);
        dirLights[0].position.copy(position);
        dirLights[0].target.position.copy(center);
        this._root.rootStage.add(dirLights[0]);


    }

    initCoordUI() {
        this._coordUI = new CubeUI(this);
        this.group.add(this._coordUI.group);

    }
    getGraphAreaSize() {
        let {
            x: width,
            y: height,
            z: depth
        } = this.getSize().sub(this.offset);

        //深度和宽度一直
        return {
            width: width * this.availableGraph.widthRatio,
            height: height * this.availableGraph.heightRatio,
            depth: height * this.availableGraph.heightRatio
        }
    }
    getOriginPosition(dir) {

        let { width, height, depth } = this.getGraphAreaSize();

        let origin = new Vector3();
        dir = dir || this.getDirection();
        //正面
        if (dir === FaceNames.FRONT) {
            origin.set(-width * 0.5, -height * 0.5, depth * 0.5);
        }
        //右面
        if (dir === FaceNames.RIGHT) {
            origin.set(width * 0.5, -height * 0.5, depth * 0.5);
        }
        //上面
        if (dir === FaceNames.TOP) {
            origin.set(-width * 0.5, height * 0.5, depth * 0.5);
        }
        //后面
        if (dir === FaceNames.BACK) {
            origin.set(width * 0.5, -height * 0.5, -depth * 0.5);
        }
        //左面
        if (dir === FaceNames.LEFT) {
            origin.set(-width * 0.5, -height * 0.5, -depth * 0.5);
        }
        //底面
        if (dir === FaceNames.BOTTOM) {
            origin.set(-width * 0.5, -height * 0.5, -depth * 0.5);
        }

        return origin;

    }
    getDirection() {
        let dir = new Vector3();
        this.group.getWorldDirection(dir);
        //cos(45)=0.7071067811865476
        //面对我们的cube面
        if (dir.dot(new Vector3(0, 0, 1)) > 0.7) {
            return FaceNames.FRONT;
        } else if (dir.dot(new Vector3(-1, 0, 0)) > 0.7) {
            return FaceNames.RIGHT;
        } else if (dir.dot(new Vector3(0, -1, 0)) > 0.7) {
            return FaceNames.TOP;
        } else if (dir.dot(new Vector3(1, 0, 0)) > 0.7) {
            return FaceNames.LEFT;
        } else if (dir.dot(new Vector3(0, 1, 0)) > 0.7) {
            return FaceNames.BOTTOM;
        } else if (dir.dot(new Vector3(0, 0, -1)) > 0.7) {
            return FaceNames.BACK;
        }
        return null;
    }

    updatePosition() {
        //渲染对象,非相机
        let controlOps = this._root.opt.coord.controls;
        let phi = _Math.degToRad(controlOps.alpha);   //(90-lat)*(Math.PI/180),
        let theta = _Math.degToRad(-controlOps.beta);
        let gamma = _Math.degToRad(controlOps.gamma);

        this.group.rotateX(phi);
        this.group.rotateY(theta);
        this.group.rotateZ(gamma);

        //防止旋转碰到相机
        let len = new Vector3(controlOps.boxWidth, controlOps.boxHeight, controlOps.boxDepth).length()
        this._root.renderView._camera.position.setZ(len);

    }
    drawUI() {
        this._coordUI.draw();
        this._root.app._framework.on('renderbefore', () => {
            // this.group.rotation.x+=0.01;
        })
    }
    getAxisAttribute(field) {
        let attribute = null;
        this._attributes.forEach(attr => {
            if (_.isArray(field)) {
                if (JSON.stringify(field) == JSON.stringify(attr.field)) {
                    attribute = att;
                }
            } else {
                if (attr.field == field) {
                    attribute = attr;
                }
            }
        });

        return attribute;
    }
    resetData() {
        let opt = _.clone(this.coord);
        this.xAxisAttribute.resetDataOrg(this.getAxisDataFrame(opt.xAxis.field));
        this.xAxisAttribute.setDataSection();
        this.xAxisAttribute.calculateProps();

        this.yAxisAttribute.resetDataOrg(this.getAxisDataFrame(opt.yAxis.field));
        this.yAxisAttribute.setDataSection();
        this.yAxisAttribute.calculateProps();


        this.zAxisAttribute.resetDataOrg(this.getAxisDataFrame(opt.zAxis.field));
        this.zAxisAttribute.setDataSection();
        this.zAxisAttribute.calculateProps();

        

        //UI组件resetData
        this._coordUI.resetData();
    }

}

export default Cube;;