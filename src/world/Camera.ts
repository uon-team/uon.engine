
import { Vector3, Quaternion, Matrix4, Frustum, ToDegrees, ToRadians } from '@uon/math';


const TEMP_QUAT = new Quaternion();
const TEMP_VEC3 = new Vector3();
const TEMP_MATRIX4 = new Matrix4();
const TEMP_MATRIX4_2 = new Matrix4();


export enum DirtyMatrix {
    World = 1 << 0,
    View = 1 << 1,
    Projection = 1 << 2,
    All = World | View | Projection
}

/**
 * Base class for cameras
 */
export class Camera {

    protected _translation: Vector3;
    protected _orientation: Quaternion;
    protected _up: Vector3;

    protected _world: Matrix4;
    protected _view: Matrix4;
    protected _projection: Matrix4;
    protected _viewproj: Matrix4;
    protected _frustum: Frustum;

    protected dirtyFlag: DirtyMatrix = DirtyMatrix.All;

    /**
     * Constructs a new camera
     */
    constructor() {

        this._translation = new Vector3();
        this._orientation = new Quaternion(0, 0, 0, 1);
        this._up = Vector3.UnitY.clone();

        this._world = new Matrix4();
        this._view = new Matrix4();
        this._projection = new Matrix4();
        this._viewproj = new Matrix4();
        this._frustum = new Frustum();

    }

    /**
     * Set the matrices as dirty
     */
    set dirty(val: boolean) {
        this.dirtyFlag |= val ? DirtyMatrix.World | DirtyMatrix.View : 0;
        //this._projDirty = val;
    }


    /**
     * The world-space matrix for this camera
     */
    get world() {

        if ((this.dirtyFlag & DirtyMatrix.World) != 0) {

            this._world.compose(this._translation, this._orientation, Vector3.One);
            this.dirtyFlag &= ~DirtyMatrix.World;
        }

        return this._world;
    }

    /**
     * The view space matrix for this camera (world-space inverse)
     */
    get view() {

        if ((this.dirtyFlag & (DirtyMatrix.World | DirtyMatrix.View)) != 0) {

            this._view.inverse(this.world);
            this.dirtyFlag &= ~DirtyMatrix.View;
        }

        return this._view;
    }

    /**
     * The projection matrix for this camera
     */
    get projection() {

        if ((this.dirtyFlag & DirtyMatrix.Projection) != 0) {
            this.updateProjection();
            this.dirtyFlag &= ~DirtyMatrix.Projection;
        }

        return this._projection;
    }

    /**
     * The combined view and projection matrix
     */
    get viewProjection() {

        if (this.dirtyFlag > 0) {
            this._viewproj.copy(this.view).multiply(this.projection);
        }

        return this._viewproj;

    }

    /**
     * Getter for the translation vector
     */
    get translation() {
        return this._translation;
    }

    /**
     * Setter for the translation vector
     * @param vec3
     */
    set translation(vec3: Vector3) {

        this._translation.copy(vec3);
        this.dirtyFlag |= DirtyMatrix.World | DirtyMatrix.View;
    }

    /**
     * Getter for the orientation quaternion
     */
    get orientation() {
        return this._orientation;
    }

    /**
     * Setter for the orientation quaternion
     * @param quat
     */
    set orientation(quat: Quaternion) {
        this._orientation.copy(quat);
        this.dirtyFlag |= DirtyMatrix.World | DirtyMatrix.View;
    }

    /**
     * Translate the camera along an axis
     * @param axis
     * @param distance
     */
    translate(axis: Vector3, distance: number) {

        TEMP_VEC3.copy(axis).applyQuaternion(this._orientation);

        this._translation.add(TEMP_VEC3.multiplyScalar(distance));

        this.dirtyFlag |= DirtyMatrix.World | DirtyMatrix.View;
    }

    /**
     * Rotate the camera with axis and angle
     * @param axis
     * @param angle
     */
    rotate(axis: Vector3, angle: number) {

        TEMP_QUAT.fromAxisAngle(axis, angle);
        this._orientation.multiply(TEMP_QUAT);

        this.dirtyFlag |= DirtyMatrix.World | DirtyMatrix.View;
    }

    /**
     * Orients the camera to be facing a world position
     * @param point
     */
    lookAt(point: Vector3) {

        var m = TEMP_MATRIX4.identity();
        m.lookAt(this._translation, point, this._up);

        this._orientation.fromRotationMatrix(m);

        this.dirtyFlag |= DirtyMatrix.World | DirtyMatrix.View;
    }

    /**
     * Must implement in sub class
     */
    protected updateProjection() {
        throw 'Not Implemented';
    }


};



/**
 * Perspective transformation camera
 */
export class PerspectiveCamera extends Camera {


    private _fov: number;
    private _aspect: number;
    private _near: number;
    private _far: number;
    private _zoom: number;

    /**
     * Creates a new perspective camera
     * @param fov
     * @param aspect
     * @param near
     * @param far
     */
    constructor(fov?: number, aspect?: number, near?: number, far?: number) {
        super();

        this._fov = fov !== undefined ? fov : 50;
        this._aspect = aspect !== undefined ? aspect : 1;
        this._near = near !== undefined ? near : 1e-6;
        this._far = far !== undefined ? far : 1e27;
        this._zoom = 1;

    }

    get fov() {
        return this._fov;
    }

    set fov(val) {
        this._fov = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get aspect() {
        return this._aspect;
    }

    set aspect(val) {
        this._aspect = val;

        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get zoom() {
        return this._zoom;
    }

    set zoom(val) {
        this._zoom = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get near() {
        return this._near;
    }

    set near(val) {
        this._near = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get far() {
        return this._far;
    }

    set far(val) {
        this._far = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }


    /**
     * Update the projection matrix
     */
    protected updateProjection() {

        let fov = ToDegrees(2 * Math.atan(Math.tan(ToRadians(this._fov) * 0.5) / this._zoom));

        this._projection.makePerspective(fov, this._aspect, this._near, this._far);
    }

};

/**
 * Orthographic camera
 */
export class OrthographicCamera extends Camera {


    private _left: number;
    private _right: number;
    private _top: number;
    private _bottom: number;
    private _near: number;
    private _far: number;
    private _zoom: number;

    /**
     * Creates a new orthographic camera
     * @param {Number} fov
     * @param {Number} aspect
     * @param {Number} near
     * @param {Number} far
     */
    constructor(left: number, right: number, top: number, bottom: number, near?: number, far?: number) {
        super();

        this._left = left;
        this._right = right;
        this._top = top;
        this._bottom = bottom;
        this._near = near !== undefined ? near : 1e-6;
        this._far = far !== undefined ? far : 1e27;
        this._zoom = 1;

    }

    get left() {
        return this._left;
    }

    set left(val) {
        this._left = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get right() {
        return this._right;
    }

    set right(val) {
        this._right = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get top() {
        return this._top;
    }

    set top(val) {
        this._top = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get bottom() {
        return this._bottom;
    }

    set bottom(val) {
        this._bottom = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get zoom() {
        return this._zoom;
    }

    set zoom(val) {
        this._zoom = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get near() {
        return this._near;
    }

    set near(val) {
        this._near = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }

    get far() {
        return this._far;
    }

    set far(val) {
        this._far = val;
        this.dirtyFlag |= DirtyMatrix.Projection;
    }


    /**
     * Update the projection matrix
     */
    protected updateProjection() {

        let zoom = this._zoom;

        this._projection.makeOrthographic(
            this._left * zoom, this._right * zoom,
            this._top * zoom, this._bottom * zoom,
            this._near, this._far);
    }

};


