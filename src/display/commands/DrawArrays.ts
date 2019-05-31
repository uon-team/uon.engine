import { Type, FindMetadataOfType, META_ANNOTATIONS } from '@uon/core';
import { DisplayContext } from '../DisplayContext';
import { VertexBuffer, VertexLayout } from '../Buffer';
import { BindAttributes } from './Utils';

export class DrawArraysCommand {

    private vertexCount: number;

    private attrNames: string[] = [];

    constructor(public vertices: VertexBuffer, public topology: number) {

        this.vertexCount = vertices.count;

        this.attrNames
    }

    call(context: DisplayContext) {

        const gl = context.gl;
        const buffer = this.vertices;

        const current_program = context.states.program;

        current_program.inputs.forEach((vi) => {
            gl.disableVertexAttribArray(vi.location);
        });


        gl.bindBuffer(buffer.target, buffer.id);

        BindAttributes(gl, current_program, buffer.layout);

        gl.drawArrays(this.topology, 0, this.vertexCount);


    }
}